import type { CompraEstadoPago, Currency, MotivoReembolso, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { VENTANA_CALIFICACION_DIAS } from "@/lib/ratings";
import { calcularFee } from "@/lib/pagos/mp";
import { obtenerCuentaMpVigente } from "@/lib/pagos/oauth";
import {
  crearPreferenciaPago,
  PreferenciaFallidaError,
} from "@/lib/pagos/preferencias";
import type { PagoVerificado } from "@/lib/pagos/pagos";
import { reembolsarCompra } from "@/lib/pagos/reembolsos";
import {
  crearNotificacion,
  notificarCambioEstadoPublicacion,
  notificarFavoritosCambioPublicacion,
} from "@/lib/notificaciones";

const DIA_MS = 24 * 60 * 60 * 1000;

/** TTL de las órdenes PENDIENTES antes de expirar (D5): 30 minutos. */
export const VENCIMIENTO_ORDEN_MINUTOS = 30;

/** Compra con detalle mínimo para la UI de "Mis compras" (RF-29/RF-41). */
export type CompraConDetalle = {
  id: string;
  estadoPago: CompraEstadoPago;
  aprobadoAt: Date | null;
  medioPago: string | null;
  motivoReembolso: MotivoReembolso | null;
  listing: {
    id: string;
    title: string;
    images: Array<{ url: string; alt: string | null }>;
  };
  precioUnitario: Prisma.Decimal;
  currency: Currency;
  cantidad: number;
  createdAt: Date;
  rating: {
    id: string;
    puntaje: number;
    comentario: string | null;
    createdAt: Date;
  } | null;
};

/**
 * Expiración LAZY de órdenes vencidas (D5): marca EXPIRADA en batch toda
 * Compra PENDIENTE cuya `fechaVencimiento` ya pasó. Se invoca al leer
 * /compras y antes de procesar el webhook (sin cron en Vercel). Devuelve la
 * cantidad de órdenes expiradas; `ahora` es inyectable para tests.
 */
export async function expirarOrdenesVencidas(
  ahora = new Date()
): Promise<number> {
  const resultado = await prisma.compra.updateMany({
    where: {
      estadoPago: "PENDIENTE",
      fechaVencimiento: { lt: ahora },
    },
    data: { estadoPago: "EXPIRADA" },
  });
  return resultado.count;
}

/**
 * Devuelve true si la compra sigue dentro de la ventana de calificación de
 * 30 días (RF-29). La ventana es INCLUSIVA: una compra con
 * `createdAt + 30 días >= ahora` todavía puede calificarse, exactamente con
 * la misma semántica del check de `calificarVenta` (RF-27, `>` 30 días
 * rechaza). `ahora` es inyectable para tests deterministas.
 */
export function compraEnVentanaCalificacion(
  createdAt: Date,
  ahora = Date.now()
): boolean {
  return ahora - createdAt.getTime() <= VENTANA_CALIFICACION_DIAS * DIA_MS;
}

/**
 * Devuelve las compras del usuario para la página "Mis compras" (RF-29/D7):
 * una sola consulta con include (sin N+1) que trae el detalle mínimo de la
 * publicación (solo su primera imagen), el rating si la compra ya fue
 * calificada y los campos de estado de pago (RF-41). Antes de leer dispara la
 * expiración lazy de órdenes vencidas (D5). Ordenadas de más reciente a más
 * antigua.
 */
export async function obtenerMisCompras(
  compradorId: string
): Promise<CompraConDetalle[]> {
  await expirarOrdenesVencidas();

  return prisma.compra.findMany({
    where: { compradorId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      },
      rating: {
        select: { id: true, puntaje: true, comentario: true, createdAt: true },
      },
    },
  });
}

/** Error de dominio: la publicación a comprar/gestionar no existe o fue eliminada. */
export class PublicacionNoEncontradaError extends Error {
  constructor() {
    super("La publicación no existe");
    this.name = "PublicacionNoEncontradaError";
  }
}

/** Error de dominio: el comprador intenta comprar su propia publicación. */
export class CompraPublicacionPropiaError extends Error {
  constructor() {
    super("No podés comprar tu propia publicación");
    this.name = "CompraPublicacionPropiaError";
  }
}

/** Error de dominio: la publicación no está activa para comprarse. */
export class PublicacionNoActivaError extends Error {
  constructor() {
    super("La publicación no está activa");
    this.name = "PublicacionNoActivaError";
  }
}

/** Error de dominio: la publicación no tiene stock disponible. */
export class SinStockError extends Error {
  constructor() {
    super("La publicación no tiene stock disponible");
    this.name = "SinStockError";
  }
}

/** Error de dominio: el pago no pudo inicializarse (→ 502 PAGO_INDISPONIBLE). */
export class PagoIndisponibleError extends Error {
  constructor(causa?: unknown) {
    super("El pago no está disponible en este momento", { cause: causa });
    this.name = "PagoIndisponibleError";
  }
}

/** Error de dominio: la publicación no pertenece al usuario que la gestiona. */
export class PublicacionNoPerteneceError extends Error {
  constructor() {
    super("No tenés permiso para gestionar esta publicación");
    this.name = "PublicacionNoPerteneceError";
  }
}

/** Error de dominio: la transición de estado pedida no es válida. */
export class AccionEstadoInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "AccionEstadoInvalidaError";
  }
}

/**
 * Inicia una compra creando una orden PENDIENTE con su preferencia de pago
 * (RF-26 modificada / RF-39): valida 404/403/400/409 igual que antes, crea la
 * Compra con `estadoPago PENDIENTE`, `fechaVencimiento` (TTL D5), el
 * `marketplaceFee` del 5% (D6) y SIN tocar stock ni pasar a SOLD — el
 * decremento ocurre recién al aprobarse el pago (webhook). La preferencia de
 * Checkout Pro se crea con el token del VENDEDOR (collector); si falla, se
 * elimina la orden compensatoria y se lanza `PagoIndisponibleError` (502, sin
 * órdenes huérfanas). Devuelve el contrato `{ compra: { id, estadoPago },
 * initPoint }` (el redirect al checkout es FUERA de la plataforma).
 */
export async function iniciarCompra({
  compradorId,
  listingId,
}: {
  compradorId: string;
  listingId: string;
}) {
  const publicacion = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: {
      id: true,
      ownerId: true,
      status: true,
      stock: true,
      title: true,
      price: true,
      currency: true,
    },
  });
  if (!publicacion) {
    throw new PublicacionNoEncontradaError();
  }
  if (publicacion.ownerId === compradorId) {
    throw new CompraPublicacionPropiaError();
  }
  if (publicacion.status !== "ACTIVE") {
    throw new PublicacionNoActivaError();
  }
  if (publicacion.stock <= 0) {
    throw new SinStockError();
  }

  // Orden PENDIENTE con external_reference = compra.id (RF-39). El decremento
  // y SOLD se mueven a la aprobación del pago (RF-26 modificada).
  const fechaVencimiento = new Date(
    Date.now() + VENCIMIENTO_ORDEN_MINUTOS * 60 * 1000
  );
  const marketplaceFee = calcularFee(publicacion.price);

  const compra = await prisma.compra.create({
    data: {
      compradorId,
      listingId,
      precioUnitario: publicacion.price,
      currency: publicacion.currency,
      cantidad: 1,
      estadoPago: "PENDIENTE",
      fechaVencimiento,
      marketplaceFee,
    },
    select: { id: true, estadoPago: true },
  });

  // Cuenta de MP del vendedor: collector del pago (RF-47/RF-48). Sin cuenta
  // vigente no se puede cobrar: se compensa la orden y se responde 502.
  const vendedorMp = await obtenerCuentaMpVigente(publicacion.ownerId);
  if (!vendedorMp) {
    await prisma.compra
      .delete({ where: { id: compra.id } })
      .catch(() => undefined);
    throw new PagoIndisponibleError(
      new Error("El vendedor no tiene cuenta de Mercado Pago vigente")
    );
  }

  try {
    const { initPoint } = await crearPreferenciaPago({
      compra: {
        id: compra.id,
        listingId: publicacion.id,
        precioUnitario: publicacion.price,
        currency: publicacion.currency,
        cantidad: 1,
        fechaVencimiento,
        marketplaceFee,
      },
      vendedorMp: { accessToken: vendedorMp.accessToken },
    });
    return {
      compra: { id: compra.id, estadoPago: compra.estadoPago },
      initPoint,
    };
  } catch (error) {
    if (error instanceof PreferenciaFallidaError) {
      // Compensación: nunca quedan órdenes huérfanas sin preferencia creada.
      await prisma.compra
        .delete({ where: { id: compra.id } })
        .catch(() => undefined);
      throw new PagoIndisponibleError(error);
    }
    throw error;
  }
}

/**
 * Procesa un pago `approved` verificado server-side (RF-43..RF-46, RNF-17/18):
 * 1) RF-46: si el monto o la moneda pagados difieren de la Compra → registra
 *    `PAGO_INCONSISTENTE` y NO procesa (sin decremento ni SOLD).
 * 2) `$transaction` con el patrón atómico de la casa:
 *    (a) updateMany Compra PENDIENTE|EXPIRADA → APROBADO (RNF-17: count 0 ⇒
 *        ya procesada ⇒ no-op idempotente; EXPIRADA se procesa igual porque
 *        un pago real nunca se pierde, D5);
 *    (b) updateMany Listing { ACTIVE, deletedAt null, stock > 0 } →
 *        stock −1 / soldCount +1; count 0 ⇒ carrera SIN_STOCK → reembolso
 *        automático D4; count 1 ⇒ stock 0 → SOLD en la misma tx.
 * Notificaciones best-effort POST-commit (un fallo nunca revierte la tx):
 * venta paga al vendedor (`pago_aprobado`), y si SOLD, estado vendida +
 * favoritos. Devuelve un resumen del resultado de la transacción.
 */
export async function aprobarPagoCompra({
  externalReference,
  pago,
}: {
  externalReference: string;
  pago: PagoVerificado;
}) {
  const compra = await prisma.compra.findUnique({
    where: { id: externalReference },
    select: {
      id: true,
      compradorId: true,
      listingId: true,
      precioUnitario: true,
      currency: true,
      listing: { select: { id: true, ownerId: true, title: true } },
    },
  });
  if (!compra) {
    return { procesada: false, sinStock: false, pasoASold: false };
  }

  // RF-46: el monto/moneda reales vienen de Payment.get (RNF-16); una
  // discrepancia es un intento inconsistente → rechazo sin efectos.
  const montoCoincide = compra.precioUnitario.equals(pago.transactionAmount);
  const monedaCoincide = compra.currency === pago.currencyId;
  if (!montoCoincide || !monedaCoincide) {
    console.error("PAGO_INCONSISTENTE", {
      compraId: compra.id,
      montoEsperado: compra.precioUnitario.toString(),
      montoPagado: pago.transactionAmount.toString(),
      monedaEsperada: compra.currency,
      monedaPagada: pago.currencyId,
    });
    return { procesada: false, sinStock: false, pasoASold: false };
  }

  const resultado = await prisma.$transaction(async (tx) => {
    // (a) RNF-17: transición atómica de estado. PENDIENTE o EXPIRADA son
    // "no procesadas" (D5: un pago real de una orden vencida se procesa
    // igual); APROBADO/REEMBOLSADO/FALLIDO → count 0 → no-op idempotente.
    const aprobacion = await tx.compra.updateMany({
      where: { id: compra.id, estadoPago: { in: ["PENDIENTE", "EXPIRADA"] } },
      data: {
        estadoPago: "APROBADO",
        mpPaymentId: String(pago.id),
        aprobadoAt: new Date(),
        medioPago: pago.paymentMethodId ?? null,
      },
    });
    if (aprobacion.count === 0) {
      return { aprobada: false, sinStock: false, pasoASold: false };
    }

    // (b) RNF-18: decremento condicionado en la MISMA transacción; el
    // perdedor de la carrera obtiene count 0 (→ D4, reembolso automático).
    const decremento = await tx.listing.updateMany({
      where: {
        id: compra.listingId,
        status: "ACTIVE",
        deletedAt: null,
        stock: { gt: 0 },
      },
      data: {
        stock: { decrement: 1 },
        soldCount: { increment: 1 },
      },
    });
    if (decremento.count === 0) {
      return { aprobada: true, sinStock: true, pasoASold: false };
    }

    // La última unidad vendida pausa la publicación (SOLD) en la misma tx.
    const trasCompra = await tx.listing.findUnique({
      where: { id: compra.listingId },
      select: { id: true, status: true, stock: true },
    });
    const pasoASold = trasCompra?.stock === 0 && trasCompra.status === "ACTIVE";
    if (pasoASold) {
      await tx.listing.update({
        where: { id: compra.listingId },
        data: { status: "SOLD" },
      });
    }

    return { aprobada: true, sinStock: false, pasoASold };
  });

  // Post-commit, best-effort: nunca revierte la aprobación ya persistida.
  if (resultado.aprobada && resultado.sinStock) {
    await reembolsarPorSinStock({ compra, pago });
  } else if (resultado.aprobada) {
    await notificarVentaPagada({ compra, pasoASold: resultado.pasoASold });
  }

  return {
    procesada: resultado.aprobada,
    sinStock: resultado.sinStock,
    pasoASold: resultado.pasoASold,
  };
}

/**
 * D4: la carrera por la última unidad se resuelve con reembolso AUTOMÁTICO —
 * el pago ya está `approved` en MP, el dinero hay que devolverlo sí o sí. Se
 * ejecuta post-commit: Payment.refund del monto completo + Compra
 * REEMBOLSADO + motivoReembolso SIN_STOCK + notificación al comprador. Si el
 * refund falla se loguea para conciliación manual (la tx ya quedó persistida).
 */
async function reembolsarPorSinStock({
  compra,
  pago,
}: {
  compra: {
    id: string;
    compradorId: string;
    listingId: string;
  };
  pago: PagoVerificado;
}) {
  try {
    const { mpRefundId } = await reembolsarCompra({
      compra: { id: compra.id, mpPaymentId: String(pago.id) },
    });

    await prisma.compra.update({
      where: { id: compra.id },
      data: {
        estadoPago: "REEMBOLSADO",
        motivoReembolso: "SIN_STOCK",
        reembolsadoAt: new Date(),
      },
    });

    await crearNotificacion(
      compra.compradorId,
      compra.listingId,
      "Compra reembolsada",
      `Tu pago fue reembolsado porque la publicación se agotó antes de confirmarse (reembolso ${mpRefundId}).`,
      "GENERAL",
      null
    );
  } catch (error) {
    console.error("REFUND_SIN_STOCK_FALLIDO", { compraId: compra.id, error });
  }
}

/**
 * Notifica la venta paga al vendedor (payload `pago_aprobado`, tipo GENERAL)
 * y, si la publicación pasó a SOLD, reutiliza las notificaciones de cambio de
 * estado y de favoritos. Todo best-effort post-commit.
 */
async function notificarVentaPagada({
  compra,
  pasoASold,
}: {
  compra: {
    id: string;
    compradorId: string;
    listingId: string;
    precioUnitario: Prisma.Decimal;
    currency: Currency;
    listing: { id: string; ownerId: string; title: string };
  };
  pasoASold: boolean;
}) {
  const { ownerId, title } = compra.listing;
  // toFixed(2) normaliza la escala del monto (RNF-19): "1500.50", no "1500.5".
  const monto = compra.precioUnitario.toFixed(2);

  try {
    await crearNotificacion(
      ownerId,
      compra.listingId,
      "Pago recibido",
      `Recibiste el pago de "${title}" por ${monto} ${compra.currency}.`,
      "GENERAL",
      {
        evento: "pago_aprobado",
        compraId: compra.id,
        listingId: compra.listingId,
        titulo: title,
        monto,
      }
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  if (pasoASold) {
    try {
      await notificarCambioEstadoPublicacion(
        ownerId,
        compra.listingId,
        title,
        "vendida"
      );
    } catch {
      // La notificación es complementaria: se ignora el error silenciosamente.
    }

    try {
      await notificarFavoritosCambioPublicacion(
        compra.listingId,
        "FAVORITO_CAMBIO_ESTADO",
        {
          listingId: compra.listingId,
          titulo: title,
          estadoAnterior: "ACTIVE",
          estadoNuevo: "SOLD",
        },
        "Cambió el estado de un favorito",
        `"${title}" cambió de estado a SOLD.`
      );
    } catch {
      // La notificación es complementaria: se ignora el error silenciosamente.
    }
  }
}

type PublicacionPropia = {
  id: string;
  ownerId: string;
  status: string;
  title: string;
};

/**
 * Valida que una publicación exista, no esté eliminada y pertenezca al usuario.
 * Devuelve la publicación si cumple; si no, lanza el error de dominio
 * correspondiente.
 */
async function validarPublicacionPropia(
  ownerId: string,
  listingId: string
): Promise<PublicacionPropia> {
  const publicacion = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: { id: true, ownerId: true, status: true, title: true },
  });
  if (!publicacion) {
    throw new PublicacionNoEncontradaError();
  }
  if (publicacion.ownerId !== ownerId) {
    throw new PublicacionNoPerteneceError();
  }
  return publicacion;
}

/**
 * Notifica al dueño y a los favoritos un cambio de estado manual (pausar /
 * reanudar) con el estado anterior y nuevo correctos. Best-effort: un fallo
 * de notificación no debe romper la acción.
 */
async function notificarCambioEstadoPropia(
  publicacion: { id: string; ownerId: string; title: string },
  estadoAnterior: string,
  estadoNuevo: "PAUSED" | "ACTIVE"
) {
  try {
    await crearNotificacion(
      publicacion.ownerId,
      publicacion.id,
      estadoNuevo === "PAUSED" ? "Publicación pausada" : "Publicación reanudada",
      estadoNuevo === "PAUSED"
        ? `Tu publicación "${publicacion.title}" fue pausada y ya no está visible para otros usuarios.`
        : `Tu publicación "${publicacion.title}" volvió a estar activa.`,
      "ESTADO_PUBLICACION",
      { listingId: publicacion.id, estado: estadoNuevo }
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  try {
    await notificarFavoritosCambioPublicacion(
      publicacion.id,
      "FAVORITO_CAMBIO_ESTADO",
      {
        listingId: publicacion.id,
        titulo: publicacion.title,
        estadoAnterior,
        estadoNuevo,
      },
      "Cambió el estado de un favorito",
      `"${publicacion.title}" cambió de estado a ${estadoNuevo}.`
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }
}

/**
 * Pausa la propia publicación (solo desde ACTIVE). Valida titularidad y estado;
 * notifica al dueño y a los favoritos. Retorna el estado resultante.
 */
export async function pausarPublicacionPropia(ownerId: string, listingId: string) {
  const publicacion = await validarPublicacionPropia(ownerId, listingId);
  if (publicacion.status !== "ACTIVE") {
    throw new AccionEstadoInvalidaError("Solo podés pausar publicaciones activas");
  }

  const resultado = await prisma.listing.update({
    where: { id: listingId },
    data: { status: "PAUSED" },
    select: { id: true, status: true },
  });

  await notificarCambioEstadoPropia(publicacion, publicacion.status, "PAUSED");
  return resultado;
}

/**
 * Reanuda una publicación propia pausada (solo desde PAUSED; nunca reanuda una
 * SOLD o REJECTED). Valida titularidad y estado; notifica al dueño y a los
 * favoritos. Retorna el estado resultante.
 */
export async function reanudarPublicacionPropia(ownerId: string, listingId: string) {
  const publicacion = await validarPublicacionPropia(ownerId, listingId);
  if (publicacion.status !== "PAUSED") {
    throw new AccionEstadoInvalidaError("Solo podés reanudar publicaciones pausadas");
  }

  const resultado = await prisma.listing.update({
    where: { id: listingId },
    data: { status: "ACTIVE" },
    select: { id: true, status: true },
  });

  await notificarCambioEstadoPropia(publicacion, publicacion.status, "ACTIVE");
  return resultado;
}