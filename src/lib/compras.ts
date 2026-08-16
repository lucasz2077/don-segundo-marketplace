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
import { reembolsarCompra, ReembolsoFallidoError } from "@/lib/pagos/reembolsos";
import {
  crearNotificacion,
  notificarCambioEstadoPublicacion,
  notificarFavoritosCambioPublicacion,
} from "@/lib/notificaciones";

const DIA_MS = 24 * 60 * 60 * 1000;

/** TTL de las órdenes PENDIENTES antes de expirar (D5): 30 minutos. */
export const VENCIMIENTO_ORDEN_MINUTOS = 30;

/** Ventana de devolución de una compra: 7 días corridos desde la aprobación
 * del pago (RF-50). */
export const VENTANA_DEVOLUCION_DIAS = 7;

/**
 * Helper interno que generaliza la ventana de tiempo INCLUSIVA medida desde la
 * aprobación del pago: `aprobadoAt + dias <= ahora` todavía aplica. Comparten
 * esta única implementación `compraEnVentanaCalificacion` (30 días, RF-27/D9)
 * y `compraEnVentanaDevolucion` (7 días, RF-50); una sola semántica evita
 * que ambas ventanas deriven con el tiempo. `ahora` es inyectable para tests.
 */
function enVentanaDeAprobacion(
  aprobadoAt: Date | null,
  dias: number,
  ahora: number
): boolean {
  if (!aprobadoAt) {
    return false;
  }
  return ahora - aprobadoAt.getTime() <= dias * DIA_MS;
}

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
 * 30 días (RF-29). La ventana arranca en la APROBACIÓN del pago (D9, 6.6):
 * se mide desde `aprobadoAt`, no desde `createdAt`. Una compra sin fecha de
 * aprobación (no aprobada) nunca está en ventana → false. La ventana es
 * INCLUSIVA: `aprobadoAt + 30 días >= ahora` todavía puede calificarse,
 * exactamente con la misma semántica del check de `calificarVenta` (RF-27,
 * `>` 30 días rechaza). `ahora` es inyectable para tests deterministas.
 */
export function compraEnVentanaCalificacion(
  aprobadoAt: Date | null,
  ahora = Date.now()
): boolean {
  return enVentanaDeAprobacion(
    aprobadoAt,
    VENTANA_CALIFICACION_DIAS,
    ahora
  );
}

/**
 * Devuelve true si la compra sigue dentro de la ventana de devolución de
 * 7 días (RF-50). La ventana arranca en la APROBACIÓN del pago, igual que la
 * de calificación (D9): se mide desde `aprobadoAt`, no desde `createdAt`. Una
 * compra sin fecha de aprobación (no aprobada) nunca está en ventana → false.
 * La ventana es INCLUSIVA: `aprobadoAt + 7 días >= ahora` todavía puede
 * solicitarse la devolución. `ahora` es inyectable para tests deterministas.
 */
export function compraEnVentanaDevolucion(
  aprobadoAt: Date | null,
  ahora = Date.now()
): boolean {
  return enVentanaDeAprobacion(aprobadoAt, VENTANA_DEVOLUCION_DIAS, ahora);
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

/**
 * Solicita la devolución de una compra pagada (RF-49/RF-50). El comprador crea
 * una SolicitudDevolucion PENDIENTE (append-only: nunca se muta una solicitud
 * anterior; el historial vive en SolicitudDevolucion, patrón
 * SolicitudVerificacion) que el vendedor resuelve en /perfil/devoluciones.
 * Validaciones en orden:
 * 1. 404 CompraNoEncontradaError si la compra no existe.
 * 2. 403 CompraDeOtroUsuarioError si la compra es de otro comprador.
 * 3. 409 CompraNoAprobadaError si el pago no está APROBADO (RF-50: PENDIENTE/
 *    FALLIDO/REEMBOLSADO/EXPIRADA no aplican; REEMBOLSADO ya devolvió el
 *    dinero, no hay doble devolución).
 * 4. 410 VentanaDevolucionExpiradaError pasados los 7 días desde `aprobadoAt`
 *    (ventana inclusiva, misma semántica que la de calificación).
 * 5. 409 DevolucionYaPendienteError si ya existe una solicitud PENDIENTE para
 *    la misma compra (una a la vez).
 * `vendedorId` se denormaliza desde `listing.ownerId` (patrón Rating). Post-
 * commit notifica al vendedor best-effort con el payload tipado de devolución
 * (evento "devolucion", estado PENDIENTE); un fallo de notificación nunca
 * revierte la solicitud creada. Retorna la solicitud creada.
 */
export async function solicitarDevolucion({
  compradorId,
  compraId,
  motivo,
}: {
  compradorId: string;
  compraId: string;
  motivo: string;
}) {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    select: {
      id: true,
      compradorId: true,
      estadoPago: true,
      aprobadoAt: true,
      listing: { select: { id: true, ownerId: true, title: true } },
      comprador: { select: { name: true } },
    },
  });

  if (!compra) {
    throw new CompraNoEncontradaError();
  }
  if (compra.compradorId !== compradorId) {
    throw new CompraDeOtroUsuarioError();
  }
  // RF-50: solo compras con pago APROBADO y ventana medible. Una compra
  // aprobada sin `aprobadoAt` es dato corrupto: tampoco es devolucionable.
  const aprobadoAt = compra.aprobadoAt;
  if (compra.estadoPago !== "APROBADO" || !aprobadoAt) {
    throw new CompraNoAprobadaError();
  }
  if (!compraEnVentanaDevolucion(aprobadoAt)) {
    throw new VentanaDevolucionExpiradaError();
  }

  // Una sola PENDIENTE a la vez por compra; las resueltas (APROBADA/
  // RECHAZADA) no bloquean re-solicitar (append-only, RF-49).
  const pendiente = await prisma.solicitudDevolucion.findFirst({
    where: { compraId, estado: "PENDIENTE" },
    select: { id: true },
  });
  if (pendiente) {
    throw new DevolucionYaPendienteError();
  }

  const solicitud = await prisma.solicitudDevolucion.create({
    data: {
      compraId,
      compradorId,
      vendedorId: compra.listing.ownerId,
      motivo,
      estado: "PENDIENTE",
    },
    select: { id: true, estado: true, createdAt: true },
  });

  // Best-effort post-commit: nunca revierte la solicitud ya persistida.
  try {
    await crearNotificacion(
      compra.listing.ownerId,
      compra.listing.id,
      "Solicitud de devolución",
      `${compra.comprador.name} solicitó una devolución de "${compra.listing.title}".`,
      "GENERAL",
      {
        evento: "devolucion",
        solicitudId: solicitud.id,
        estado: "PENDIENTE",
      }
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  return solicitud;
}

/**
 * Resuelve una solicitud de devolución como vendedor (RF-49..RF-51):
 * aprobar o rechazar. Validaciones en orden: solicitud inexistente (404),
 * solicitud de otro vendedor (403) y solicitud ya resuelta (409).
 *
 * - **rechazar**: la solicitud pasa a RECHAZADA con `motivoRechazo` obligatorio
 *   (el route lo exige con Zod; acá hay un guard defensivo) y `resueltaAt`. La
 *   Compra SIGUE APROBADO (el rechazo no toca el dinero, RF-51) y se notifica
 *   al comprador best-effort (payload devolucion RECHAZADA). Re-solicitar tras
 *   un rechazo está permitido (historial append-only).
 * - **aprobar**: `$transaction` con transición atómica — (1) solicitud
 *   PENDIENTE → APROBADA + `resueltaAt` (count 0 ⇒ carrera → YA_RESUELTA) y
 *   (2) Compra → REEMBOLSADO + `reembolsadoAt` + `motivoReembolso`
 *   DEVOLUCION_VENDEDOR. FUERA de la tx (post-commit): `reembolsarCompra`
 *   con el `mpPaymentId` devuelve el monto COMPLETO pagado (RF-51: el
 *   comprador recibe el 100%; el vendedor absorbe marketplace_fee y costos de
 *   gateway), se persiste `mpRefundId` en la solicitud y se notifica al
 *   comprador best-effort (payload devolucion APROBADA).
 *
 * DECISIÓN DE DISEÑO 5.2 (marcada en el reporte de apply): si el refund real
 * en MP falla DESPUÉS de que la tx movió la compra a REEMBOLSADO, NO se
 * revierte la tx — la compra ya vendió (stock decrementado al aprobar el pago)
 * y un revert solo dejaría estados incoherentes. La resolución queda
 * persistida (solicitud APROBADA + compra REEMBOLSADO) y el fallo se loguea
 * `REEMBOLSO_FALLIDO` con el id de la solicitud para operación manual
 * (conciliación con MP). El route mapea 502 PAGO_INDISPONIBLE SOLO cuando el
 * refund falla sin llegar a resolver la solicitud (compra sin mpPaymentId,
 * prevalidación ANTES de la tx: dato corrupto, la solicitud queda PENDIENTE);
 * si la solicitud ya quedó resuelta, el route responde 200 con advertencia.
 * Devuelve `{ solicitud, reembolsoExitoso }` (para aprobaciones con refund
 * fallido `reembolsoExitoso` es false).
 */
export async function resolverDevolucion({
  vendedorId,
  solicitudId,
  accion,
  motivoRechazo,
}: {
  vendedorId: string;
  solicitudId: string;
  accion: "aprobar" | "rechazar";
  motivoRechazo?: string | null;
}) {
  const solicitud = await prisma.solicitudDevolucion.findUnique({
    where: { id: solicitudId },
    select: {
      id: true,
      compraId: true,
      compradorId: true,
      vendedorId: true,
      estado: true,
      compra: {
        select: {
          id: true,
          mpPaymentId: true,
          listing: { select: { id: true, ownerId: true, title: true } },
          comprador: { select: { name: true } },
        },
      },
    },
  });

  if (!solicitud) {
    throw new SolicitudNoEncontradaError();
  }
  if (solicitud.vendedorId !== vendedorId) {
    throw new SolicitudDeOtroVendedorError();
  }
  if (solicitud.estado !== "PENDIENTE") {
    throw new SolicitudYaResueltaError();
  }

  if (accion === "rechazar") {
    // RF-49: el motivo de rechazo es obligatorio (Zod lo exige en el route;
    // este guard es defensivo para el uso directo del servicio).
    if (!motivoRechazo || motivoRechazo.trim() === "") {
      throw new AccionEstadoInvalidaError("Indicá el motivo del rechazo");
    }

    const actualizada = await prisma.solicitudDevolucion.update({
      where: { id: solicitudId },
      data: { estado: "RECHAZADA", motivoRechazo, resueltaAt: new Date() },
      select: { id: true, estado: true },
    });

    // Best-effort post-commit: la Compra SIGUE APROBADO (RF-51).
    try {
      await crearNotificacion(
        solicitud.compradorId,
        solicitud.compra.listing.id,
        "Solicitud de devolución rechazada",
        `Tu solicitud de devolución de "${solicitud.compra.listing.title}" fue rechazada. Motivo: ${motivoRechazo}`,
        "GENERAL",
        { evento: "devolucion", solicitudId, estado: "RECHAZADA" }
      );
    } catch {
      // La notificación es complementaria: se ignora el error silenciosamente.
    }

    return { solicitud: actualizada, reembolsoExitoso: true };
  }

  // aprobar
  // Prevalidación del refund ANTES de la tx (decisión 5.2): sin mpPaymentId
  // el reembolso es imposible (dato corrupto: toda compra APROBADO tiene pago
  // de MP). Fallar acá deja la solicitud PENDIENTE sin tocar → el route mapea
  // 502 PAGO_INDISPONIBLE.
  if (!solicitud.compra.mpPaymentId) {
    throw new ReembolsoFallidoError(
      new Error("La compra no tiene pago en Mercado Pago para reembolsar")
    );
  }

  const resuelta = await prisma.$transaction(async (tx) => {
    // Transición atómica PENDIENTE → APROBADA (patrón updateMany de la casa):
    // count 0 ⇒ otra resolución ganó la carrera ⇒ YA_RESUELTA idempotente.
    const aprobacion = await tx.solicitudDevolucion.updateMany({
      where: { id: solicitudId, estado: "PENDIENTE" },
      data: { estado: "APROBADA", resueltaAt: new Date() },
    });
    if (aprobacion.count === 0) {
      throw new SolicitudYaResueltaError();
    }

    // RF-51: la Compra pasa a REEMBOLSADO (el dinero vuelve al comprador).
    await tx.compra.update({
      where: { id: solicitud.compraId },
      data: {
        estadoPago: "REEMBOLSADO",
        reembolsadoAt: new Date(),
        motivoReembolso: "DEVOLUCION_VENDEDOR",
      },
    });

    return { id: solicitudId, estado: "APROBADA" };
  });

  // Post-commit, best-effort: el refund real en MP nunca revierte la tx.
  let reembolsoExitoso = true;
  try {
    const { mpRefundId } = await reembolsarCompra({
      compra: {
        id: solicitud.compraId,
        mpPaymentId: solicitud.compra.mpPaymentId,
      },
    });
    await prisma.solicitudDevolucion.update({
      where: { id: solicitudId },
      data: { mpRefundId: String(mpRefundId) },
    });
  } catch (error) {
    // DECISIÓN 5.2: la tx ya quedó persistida; NO se revierte. Se loguea el
    // fallo con el id de la solicitud para operación manual (conciliación).
    reembolsoExitoso = false;
    console.error("REEMBOLSO_FALLIDO", {
      solicitudId,
      compraId: solicitud.compraId,
      error,
    });
  }

  try {
    await crearNotificacion(
      solicitud.compradorId,
      solicitud.compra.listing.id,
      "Solicitud de devolución aprobada",
      `Tu solicitud de devolución de "${solicitud.compra.listing.title}" fue aprobada y tu pago será reembolsado.`,
      "GENERAL",
      { evento: "devolucion", solicitudId, estado: "APROBADA" }
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  return { solicitud: resuelta, reembolsoExitoso };
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

/** Error de dominio: la compra a gestionar no existe. (404 COMPRA_NO_ENCONTRADA) */
export class CompraNoEncontradaError extends Error {
  constructor() {
    super("La compra no existe");
    this.name = "CompraNoEncontradaError";
  }
}

/** Error de dominio: la compra pertenece a otro comprador. (403 SIN_PERMISO) */
export class CompraDeOtroUsuarioError extends Error {
  constructor() {
    super("No podés solicitar una devolución de una compra que no es tuya");
    this.name = "CompraDeOtroUsuarioError";
  }
}

/** Error de dominio: el pago de la compra no está aprobado. (409 COMPRA_NO_APROBADA) */
export class CompraNoAprobadaError extends Error {
  constructor() {
    super("Solo podés solicitar una devolución con el pago aprobado");
    this.name = "CompraNoAprobadaError";
  }
}

/** Error de dominio: la ventana de devolución de 7 días venció. (410 VENTANA_EXPIRADA) */
export class VentanaDevolucionExpiradaError extends Error {
  constructor() {
    super("La ventana de devolución de 7 días ya venció");
    this.name = "VentanaDevolucionExpiradaError";
  }
}

/** Error de dominio: ya existe una solicitud de devolución PENDIENTE.
 * (409 DEVO_YA_PENDIENTE) */
export class DevolucionYaPendienteError extends Error {
  constructor() {
    super("Ya tenés una solicitud de devolución pendiente para esta compra");
    this.name = "DevolucionYaPendienteError";
  }
}

/** Error de dominio: la solicitud de devolución a resolver no existe.
 * (404 SOLICITUD_NO_ENCONTRADA) */
export class SolicitudNoEncontradaError extends Error {
  constructor() {
    super("La solicitud de devolución no existe");
    this.name = "SolicitudNoEncontradaError";
  }
}

/** Error de dominio: la solicitud pertenece a otro vendedor. (403 SIN_PERMISO) */
export class SolicitudDeOtroVendedorError extends Error {
  constructor() {
    super("No podés resolver una solicitud de devolución que no es tuya");
    this.name = "SolicitudDeOtroVendedorError";
  }
}

/** Error de dominio: la solicitud ya fue resuelta. (409 YA_RESUELTA) */
export class SolicitudYaResueltaError extends Error {
  constructor() {
    super("Esta solicitud de devolución ya fue resuelta");
    this.name = "SolicitudYaResueltaError";
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