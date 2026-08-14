import type { Currency, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { VENTANA_CALIFICACION_DIAS } from "@/lib/ratings";
import {
  crearNotificacion,
  notificarCambioEstadoPublicacion,
  notificarFavoritosCambioPublicacion,
} from "@/lib/notificaciones";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Compra con detalle mínimo para la UI de "Mis compras" (RF-29). */
export type CompraConDetalle = {
  id: string;
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
 * publicación (solo su primera imagen) y el rating si la compra ya fue
 * calificada. Ordenadas de más reciente a más antigua.
 */
export async function obtenerMisCompras(
  compradorId: string
): Promise<CompraConDetalle[]> {
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
 * Compra una unidad de una publicación activa y registra la Compra en la
 * MISMA transacción que el decremento atómico del stock (RF-26, D1 del
 * diseño): si la transacción falla, ni el stock decrementa ni existe registro.
 * El precio y la moneda se capturan en la lectura inicial y se persisten en la
 * Compra (D2: precio histórico de la transacción). Si el stock llega a 0, la
 * publicación pasa a SOLD dentro de la tx y se notifica al dueño y a los
 * favoritos DESPUÉS del commit (best-effort: un fallo de notificación nunca
 * revierte la compra). Retorna el contrato con `compraId`.
 */
export async function comprarPublicacion({
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

  const { compraId, publicacionComprada, pasoASold } =
    await prisma.$transaction(async (tx) => {
      // Actualización atómica contra condiciones: si dos compradores piden la
      // última unidad a la vez, solo uno decrementa (stock > 0) y el otro recibe
      // count 0 y se le responde "sin stock" como error de negocio (no 500).
      const decremento = await tx.listing.updateMany({
        where: {
          id: listingId,
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
        throw new SinStockError();
      }

      // Registro de la compra en la misma tx que el decremento: o se persisten
      // ambos, o ninguno (RF-26).
      const compra = await tx.compra.create({
        data: {
          compradorId,
          listingId,
          precioUnitario: publicacion.price,
          currency: publicacion.currency,
          cantidad: 1,
        },
        select: { id: true },
      });

      const trasCompra = await tx.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          status: true,
          stock: true,
          soldCount: true,
          title: true,
        },
      });
      if (!trasCompra) {
        throw new PublicacionNoEncontradaError();
      }

      // La última unidad vendida pausa automáticamente la publicación (SOLD),
      // también dentro de la tx para que el cambio de estado quede atómico con
      // el decremento y el registro de la compra.
      const pasoASold =
        trasCompra.stock === 0 && trasCompra.status === "ACTIVE";
      if (pasoASold) {
        await tx.listing.update({
          where: { id: listingId },
          data: { status: "SOLD" },
          select: { id: true, status: true },
        });
      }

      return {
        compraId: compra.id,
        publicacionComprada: pasoASold
          ? { ...trasCompra, status: "SOLD" as const }
          : trasCompra,
        pasoASold,
      };
    });

  // Notificaciones FUERA de la tx (best-effort post-commit, D1): si la compra
  // ya quedó persistida, un fallo de notificación no debe revertirla.
  if (pasoASold) {
    try {
      await notificarCambioEstadoPublicacion(
        publicacion.ownerId,
        listingId,
        publicacion.title,
        "vendida"
      );
    } catch {
      // La notificación es complementaria: se ignora el error silenciosamente.
    }

    try {
      await notificarFavoritosCambioPublicacion(
        listingId,
        "FAVORITO_CAMBIO_ESTADO",
        {
          listingId,
          titulo: publicacion.title,
          estadoAnterior: "ACTIVE",
          estadoNuevo: "SOLD",
        },
        "Cambió el estado de un favorito",
        `"${publicacion.title}" cambió de estado a SOLD.`
      );
    } catch {
      // La notificación es complementaria: se ignora el error silenciosamente.
    }
  }

  return { ...publicacionComprada, compraId };
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