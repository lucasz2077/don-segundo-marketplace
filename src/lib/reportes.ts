import type { ReportStatus } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notificarCambioEstadoPublicacion } from "@/lib/notificaciones";
import type { CrearReporteInput } from "@/lib/validation/reporte";

/** Cantidad de reportes por página en el panel de moderación. */
export const TAMANIO_PAGINACION_REPORTES = 20;

/** Error de dominio: la publicación reportada no existe o no está activa. */
export class PublicacionNoDisponibleError extends Error {
  constructor() {
    super("La publicación no está disponible para ser reportada");
    this.name = "PublicacionNoDisponibleError";
  }
}

/** Error de dominio: un usuario intenta reportar su propia publicación. */
export class AutoReporteError extends Error {
  constructor() {
    super("No puedes reportar tu propia publicación");
    this.name = "AutoReporteError";
  }
}

/** Error de dominio: el usuario no tiene el rol de administrador. */
export class SinPermisoAdminError extends Error {
  constructor() {
    super("No tienes permiso para administrar reportes");
    this.name = "SinPermisoAdminError";
  }
}

/**
 * Etiquetas en español de motivos y estados de reporte: se mantienen en
 * src/lib/etiquetas-reportes.ts para poder importarse desde componentes
 * client sin arrastrar dependencias de servidor.
 */

export type FiltrosReportes = {
  estado?: ReportStatus;
  pagina?: number;
};

/**
 * Verifica que un usuario exista y tenga el rol ADMIN en la base de datos.
 * No confía únicamente en los claims de la sesión.
 */
export async function esAdministrador(userId: string): Promise<boolean> {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return usuario?.role === "ADMIN";
}

async function validarAdministrador(userId: string) {
  const esAdmin = await esAdministrador(userId);
  if (!esAdmin) {
    throw new SinPermisoAdminError();
  }
}

/**
 * Crea un reporte sobre una publicación activa. Valida que la publicación
 * exista, esté activa (no eliminada) y no pertenezca al propio reportante.
 * El reporte se crea con estado por defecto OPEN. Retorna el reporte creado.
 */
export async function crearReporte(
  reporterId: string,
  datos: CrearReporteInput
) {
  const publicacion = await prisma.listing.findFirst({
    where: {
      id: datos.listingId,
      status: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true, ownerId: true },
  });
  if (!publicacion) {
    throw new PublicacionNoDisponibleError();
  }
  if (publicacion.ownerId === reporterId) {
    throw new AutoReporteError();
  }

  return prisma.report.create({
    data: {
      reporterId,
      listingId: publicacion.id,
      reason: datos.razon,
      details: datos.detalles?.trim() || null,
    },
  });
}

/**
 * Lista los reportes para el panel de moderación, ordenados por fecha de
 * creación descendente y con paginación simple (20 por página). Incluye el
 * título, estado y propietario de la publicación reportada, además del
 * usuario que reportó. Filtra por estado opcionalmente.
 */
export async function obtenerReportes(
  adminId: string,
  filtros: FiltrosReportes = {}
) {
  await validarAdministrador(adminId);

  const pagina = Math.max(1, filtros.pagina ?? 1);
  const where: Prisma.ReportWhereInput = filtros.estado
    ? { status: filtros.estado }
    : {};

  const [reportes, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * TAMANIO_PAGINACION_REPORTES,
      take: TAMANIO_PAGINACION_REPORTES,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            status: true,
            owner: { select: { id: true, name: true, image: true } },
          },
        },
        reporter: { select: { id: true, name: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return {
    reportes,
    total,
    pagina,
    tamanioPagina: TAMANIO_PAGINACION_REPORTES,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANIO_PAGINACION_REPORTES)),
  };
}

/**
 * Actualiza el estado de un reporte (solo administrador). Retorna null si el
 * reporte no existe.
 */
export async function actualizarEstadoReporte(
  adminId: string,
  reporteId: string,
  estado: ReportStatus
) {
  await validarAdministrador(adminId);

  const reporte = await prisma.report.findUnique({
    where: { id: reporteId },
    select: { id: true },
  });
  if (!reporte) {
    return null;
  }

  return prisma.report.update({
    where: { id: reporteId },
    data: { status: estado },
  });
}

/**
 * Pausa una publicación (solo administrador): cambia su estado a PAUSED.
 * Se valida que la publicación exista y no esté eliminada. Notifica al dueño
 * del cambio de estado.
 */
export async function pausarPublicacion(adminId: string, listingId: string) {
  await validarAdministrador(adminId);

  const publicacion = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: { id: true, ownerId: true, title: true },
  });
  if (!publicacion) {
    throw new PublicacionNoDisponibleError();
  }

  const resultado = await prisma.listing.update({
    where: { id: listingId },
    data: { status: "PAUSED" },
    select: { id: true, status: true },
  });

  await notificarCambioEstadoPublicacion(
    publicacion.ownerId,
    listingId,
    publicacion.title,
    "pausada"
  );

  return resultado;
}

/**
 * Rechaza una publicación (solo administrador): cambia su estado a REJECTED y
 * marca deletedAt. Al quedar con deletedAt, la publicación deja de mostrarse
 * en listados y en su detalle público (RF-13 / CA-07). No elimina las
 * imágenes de Cloudinary: se conservan en caso de apelación. Notifica al
 * dueño del cambio de estado.
 */
export async function rechazarPublicacion(adminId: string, listingId: string) {
  await validarAdministrador(adminId);

  const publicacion = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: { id: true, ownerId: true, title: true },
  });
  if (!publicacion) {
    throw new PublicacionNoDisponibleError();
  }

  const resultado = await prisma.listing.update({
    where: { id: listingId },
    data: { status: "REJECTED", deletedAt: new Date() },
    select: { id: true, status: true, deletedAt: true },
  });

  await notificarCambioEstadoPublicacion(
    publicacion.ownerId,
    listingId,
    publicacion.title,
    "rechazada"
  );

  return resultado;
}