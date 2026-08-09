import { prisma } from "@/lib/db/prisma";

/** Cantidad de notificaciones por página en la bandeja del usuario. */
export const TAMANIO_PAGINACION_NOTIFICACIONES = 20;

export type EstadoCambioPublicacion = "pausada" | "rechazada";

const titulosEstadoCambio: Record<EstadoCambioPublicacion, string> = {
  pausada: "Publicación pausada",
  rechazada: "Publicación rechazada",
};

const mensajeEstadoCambio: Record<EstadoCambioPublicacion, string> = {
  pausada: "fue pausada por un administrador",
  rechazada: "fue rechazada por un administrador",
};

/**
 * Crea una notificación para un usuario con su título, mensaje y la
 * publicación de referencia (opcional). Se guarda sin leer (readAt null).
 */
export async function crearNotificacion(
  userId: string,
  listingId: string | null,
  titulo: string,
  mensaje: string
) {
  return prisma.notification.create({
    data: {
      userId,
      listingId,
      title: titulo,
      body: mensaje,
    },
    select: { id: true, readAt: true },
  });
}

/**
 * Crea la notificación dirigida al dueño cuando un administrador pausa o
 * rechaza su publicación. El mensaje usa el título real de la publicación
 * cuando está disponible, con un texto de respaldo si no se pudo leer.
 */
export async function notificarCambioEstadoPublicacion(
  ownerId: string,
  listingId: string,
  titulo: string | null,
  estado: EstadoCambioPublicacion
) {
  const tituloNotificacion = titulosEstadoCambio[estado];
  const mensajeNotificacion = titulo
    ? `Tu publicación "${titulo}" ${mensajeEstadoCambio[estado]}.`
    : `Tu publicación ${mensajeEstadoCambio[estado]}.`;

  return crearNotificacion(ownerId, listingId, tituloNotificacion, mensajeNotificacion);
}

/**
 * Lista las notificaciones del usuario, de la más reciente a la más antigua,
 * con paginación simple (20 por página). Incluye el estado de la publicación
 * de referencia para saber si el enlace al detalle sigue disponible.
 * Sin N+1: una única query con include.
 */
export async function obtenerNotificaciones(
  userId: string,
  pagina = 1
) {
  const paginaActual = Math.max(1, pagina);

  const [notificaciones, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (paginaActual - 1) * TAMANIO_PAGINACION_NOTIFICACIONES,
      take: TAMANIO_PAGINACION_NOTIFICACIONES,
      include: {
        listing: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    notificaciones,
    total,
    pagina: paginaActual,
    tamanioPagina: TAMANIO_PAGINACION_NOTIFICACIONES,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANIO_PAGINACION_NOTIFICACIONES)),
  };
}

/**
 * Cuenta las notificaciones sin leer (readAt null) de un usuario, para el
 * badge de la navegación.
 */
export function contarNoLeidas(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

/**
 * Marca como leídas todas las notificaciones de un usuario (al ingresar a su
 * bandeja). Retorna la cantidad de notificaciones actualizadas.
 */
export async function marcarNotificacionesLeidas(userId: string) {
  const resultado = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return resultado.count;
}