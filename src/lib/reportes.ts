import type {
  ModerationActionAccion,
  ReportReason,
  ReportStatus,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { etiquetasEstadoReporte } from "@/lib/etiquetas-reportes";
import {
  notificarCambioEstadoPublicacion,
  notificarFavoritosCambioPublicacion,
} from "@/lib/notificaciones";
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

/** Límite de reportes por día por usuario para frenar el spam (RF-25). */
export const LIMITE_REPORTES_POR_DIA_POR_USUARIO = 5;

/** Error de dominio: se superó el límite diario de reportes del usuario. */
export class LimiteReportesError extends Error {
  readonly codigo = "REPORT_LIMIT_EXCEEDED";
  readonly status = 429;

  constructor() {
    super(
      `Alcanzaste el límite de ${LIMITE_REPORTES_POR_DIA_POR_USUARIO} reportes por día. Intentalo de nuevo mañana.`
    );
    this.name = "LimiteReportesError";
  }
}

/** Error de dominio: el reporte solicitado no existe. */
export class ReporteNoEncontradoError extends Error {
  readonly codigo = "REPORTE_NO_ENCONTRADO";
  readonly status = 404;

  constructor() {
    super("El reporte no existe.");
    this.name = "ReporteNoEncontradoError";
  }
}

/** Error de dominio: se intentó pausar/rechazar sin que el reporte esté Revisado. */
export class ReporteNoRevisadoError extends Error {
  readonly codigo = "REPORTE_NO_REVISADO";
  readonly status = 400;

  constructor() {
    super("Para pausar o rechazar la publicación, el reporte debe estar Revisado.");
    this.name = "ReporteNoRevisadoError";
  }
}

/**
 * Error de dominio: la transición de estado pedida no procede (RF-25).
 * El flujo válido es OPEN → REVIEWED → RESOLVED/DISMISSED; RESOLVED y
 * DISMISSED son terminales e inmutables.
 */
export class TransicionEstadoInvalidaError extends Error {
  readonly codigo = "TRANSICION_INVALIDA";
  readonly status = 400;

  constructor(desde: ReportStatus, hacia: ReportStatus) {
    super(
      `No se puede pasar el reporte de ${etiquetasEstadoReporte[desde]} a ${etiquetasEstadoReporte[hacia]}. El flujo es Abierto → Revisado → Resuelto/Descartado.`
    );
    this.name = "TransicionEstadoInvalidaError";
  }
}

/**
 * Inicio del día en America/Argentina/Buenos_Aires (UTC-3 fijo, sin DST desde
 * 2009). El offset fijo permite calcularlo sin librerías de zona horaria: se
 * restan 3 horas al instante y se leen los componentes UTC como calendario
 * local argentino; el inicio del día es 03:00 UTC (00:00 ART). Exportado para
 * poder testearlo (decisión D2 del diseño).
 */
export function inicioDiaArgentina(ahora: Date = new Date()): Date {
  const local = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 3)
  );
}

/** Mapa de transiciones de estado válidas del flujo de moderación (RF-25). */
const TRANSICIONES_VALIDAS: Record<ReportStatus, ReadonlySet<ReportStatus>> = {
  OPEN: new Set<ReportStatus>(["REVIEWED"]),
  REVIEWED: new Set<ReportStatus>(["RESOLVED", "DISMISSED"]),
  RESOLVED: new Set<ReportStatus>(),
  DISMISSED: new Set<ReportStatus>(),
};

/**
 * Valida una transición de estado de un reporte (RF-25). Solo se aceptan
 * OPEN → REVIEWED y REVIEWED → RESOLVED/DISMISSED; los estados terminales
 * (RESOLVED/DISMISSED) son inmutables y toda otra transición (incluida
 * misma → misma) lanza TransicionEstadoInvalidaError.
 */
export function validarTransicionReporte(
  desde: ReportStatus,
  hacia: ReportStatus
): void {
  if (!TRANSICIONES_VALIDAS[desde]?.has(hacia)) {
    throw new TransicionEstadoInvalidaError(desde, hacia);
  }
}

/**
 * Etiquetas en español de motivos y estados de reporte: se mantienen en
 * src/lib/etiquetas-reportes.ts para poder importarse desde componentes
 * client sin arrastrar dependencias de servidor.
 */

export type FiltrosReportes = {
  estado?: ReportStatus;
  motivo?: ReportReason;
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

  // Límite anti-spam (RF-25): se cuentan los reportes del usuario desde el
  // inicio del día argentino; al llegar al límite se rechaza sin crear nada.
  const reportesDelDia = await prisma.report.count({
    where: {
      reporterId,
      createdAt: { gte: inicioDiaArgentina() },
    },
  });
  if (reportesDelDia >= LIMITE_REPORTES_POR_DIA_POR_USUARIO) {
    throw new LimiteReportesError();
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
  const where: Prisma.ReportWhereInput = {};
  if (filtros.estado) {
    where.status = filtros.estado;
  }
  if (filtros.motivo) {
    where.reason = filtros.motivo;
  }

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
 * Cambia el estado de un reporte (solo administrador) registrando SIEMPRE la
 * acción de moderación en la misma transacción (RF-25: no hay cambio de
 * estado sin registro). Valida la transición contra el flujo estricto
 * OPEN → REVIEWED → RESOLVED/DISMISSED. Lanza ReporteNoEncontradoError si el
 * reporte no existe.
 */
export async function cambiarEstadoReporte(
  adminId: string,
  reporteId: string,
  estado: ReportStatus
) {
  await validarAdministrador(adminId);

  const reporte = await prisma.report.findUnique({
    where: { id: reporteId },
    select: { status: true },
  });
  if (!reporte) {
    throw new ReporteNoEncontradoError();
  }

  validarTransicionReporte(reporte.status, estado);

  // El update y la auditoría se persisten atómicamente: una transición nunca
  // queda registrada sin su cambio de estado ni viceversa.
  return prisma.$transaction(async (tx) => {
    const reporteActualizado = await tx.report.update({
      where: { id: reporteId },
      data: { status: estado },
    });
    await tx.moderationAction.create({
      data: {
        reportId: reporteId,
        adminId,
        // validarTransicionReporte garantiza que `estado` ∈ {REVIEWED,
        // RESOLVED, DISMISSED}, todos valores válidos de ModerationActionAccion.
        accion: estado as ModerationActionAccion,
      },
    });
    return reporteActualizado;
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

  // Además, los favoritos de la publicación también deben enterarse del
  // cambio de estado (el dueño queda excluido dentro del helper).
  // Best-effort: un fallo de notificación no debe romper la pausa.
  try {
    await notificarFavoritosCambioPublicacion(
      listingId,
      "FAVORITO_CAMBIO_ESTADO",
      {
        listingId,
        titulo: publicacion.title,
        estadoAnterior: "ACTIVE",
        estadoNuevo: "PAUSED",
      },
      "Cambió el estado de un favorito",
      `"${publicacion.title}" cambió de estado a PAUSED.`
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

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

  // Además, los favoritos de la publicación también deben enterarse del
  // cambio de estado (el dueño queda excluido dentro del helper).
  // Best-effort: un fallo de notificación no debe romper el rechazo.
  try {
    await notificarFavoritosCambioPublicacion(
      listingId,
      "FAVORITO_CAMBIO_ESTADO",
      {
        listingId,
        titulo: publicacion.title,
        estadoAnterior: "ACTIVE",
        estadoNuevo: "REJECTED",
      },
      "Cambió el estado de un favorito",
      `"${publicacion.title}" cambió de estado a REJECTED.`
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  return resultado;
}

/**
 * Acción de moderación sobre una publicación vinculada a un reporte origen.
 * Solo PAUSED y REJECTED (efectos laterales auditados; los cambios de estado
 * del reporte usan cambiarEstadoReporte).
 */
type AccionPublicacion = Extract<ModerationActionAccion, "PAUSED" | "REJECTED">;

/**
 * Aplica una acción de moderación sobre una publicación en el contexto de un
 * reporte origen (RF-25). Exige que el reporte esté REVIEWED (sin primera
 * acción sin revisión previa), NO muta el estado del reporte y persiste la
 * auditoría en ModerationAction dentro de la misma transacción que el cambio
 * de la publicación. Notifica al dueño y a los favoritos (best-effort).
 * Retorna { publicacion, accion } con ambos resultados.
 */
async function aplicarAccionPublicacion(
  adminId: string,
  listingId: string,
  reporteId: string,
  accion: AccionPublicacion
) {
  await validarAdministrador(adminId);

  const reporte = await prisma.report.findUnique({
    where: { id: reporteId },
    select: { status: true },
  });
  if (!reporte) {
    throw new ReporteNoEncontradoError();
  }
  if (reporte.status !== "REVIEWED") {
    throw new ReporteNoRevisadoError();
  }

  const publicacion = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: { id: true, ownerId: true, title: true },
  });
  if (!publicacion) {
    throw new PublicacionNoDisponibleError();
  }

  const esPausa = accion === "PAUSED";
  const resultado = await prisma.$transaction(async (tx) => {
    const publicacionActualizada = await tx.listing.update({
      where: { id: listingId },
      data: esPausa
        ? { status: "PAUSED" }
        : { status: "REJECTED", deletedAt: new Date() },
      select: esPausa
        ? { id: true, status: true }
        : { id: true, status: true, deletedAt: true },
    });
    const accionRegistrada = await tx.moderationAction.create({
      data: { reportId: reporteId, adminId, accion },
    });
    return { publicacion: publicacionActualizada, accion: accionRegistrada };
  });

  await notificarCambioEstadoPublicacion(
    publicacion.ownerId,
    listingId,
    publicacion.title,
    esPausa ? "pausada" : "rechazada"
  );

  // Además, los favoritos de la publicación también deben enterarse del
  // cambio de estado (el dueño queda excluido dentro del helper).
  // Best-effort: un fallo de notificación no debe romper la acción.
  try {
    await notificarFavoritosCambioPublicacion(
      listingId,
      "FAVORITO_CAMBIO_ESTADO",
      {
        listingId,
        titulo: publicacion.title,
        estadoAnterior: "ACTIVE",
        estadoNuevo: esPausa ? "PAUSED" : "REJECTED",
      },
      "Cambió el estado de un favorito",
      `"${publicacion.title}" cambió de estado a ${esPausa ? "PAUSED" : "REJECTED"}.`
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  return resultado;
}

/**
 * Pausa una publicación desde la moderación de un reporte (solo administrador).
 * Exige reporte REVIEWED, audita ModerationAction con accion PAUSED y no
 * muta el estado del reporte. Retorna { publicacion, accion }.
 */
export function pausarPublicacionReporte(
  adminId: string,
  listingId: string,
  reporteId: string
) {
  return aplicarAccionPublicacion(adminId, listingId, reporteId, "PAUSED");
}

/**
 * Rechaza una publicación desde la moderación de un reporte (solo
 * administrador): estado REJECTED + deletedAt. Exige reporte REVIEWED, audita
 * ModerationAction con accion REJECTED y no muta el estado del reporte.
 * Retorna { publicacion, accion }.
 */
export function rechazarPublicacionReporte(
  adminId: string,
  listingId: string,
  reporteId: string
) {
  return aplicarAccionPublicacion(adminId, listingId, reporteId, "REJECTED");
}

/**
 * Obtiene el detalle completo de un reporte para /admin/reportes/[id] (solo
 * administrador): publicación vinculada (con su dueño), reporter e historial
 * de acciones de moderación en orden cronológico ascendente. Lanza
 * ReporteNoEncontradoError si el reporte no existe.
 */
export async function obtenerReporteDetalle(adminId: string, reporteId: string) {
  await validarAdministrador(adminId);

  const reporte = await prisma.report.findUnique({
    where: { id: reporteId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          status: true,
          owner: { select: { id: true, name: true, image: true } },
        },
      },
      reporter: { select: { id: true, name: true, image: true } },
      acciones: {
        orderBy: { createdAt: "asc" },
        include: { admin: { select: { id: true, name: true, image: true } } },
      },
    },
  });
  if (!reporte) {
    throw new ReporteNoEncontradoError();
  }
  return reporte;
}

/**
 * Lista las acciones de moderación de un reporte en orden cronológico
 * ascendente, con el administrador que las ejecutó (historial del detalle).
 */
export async function listarAcciones(adminId: string, reporteId: string) {
  await validarAdministrador(adminId);

  return prisma.moderationAction.findMany({
    where: { reportId: reporteId },
    orderBy: { createdAt: "asc" },
    include: { admin: { select: { id: true, name: true, image: true } } },
  });
}