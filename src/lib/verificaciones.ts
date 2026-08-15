import type { SolicitudVerificacionEstado } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { esAdministrador } from "@/lib/reportes";
import { crearNotificacion } from "@/lib/notificaciones";

/** Error de dominio: el usuario no tiene accountType SELLER ni BOTH. (403 NO_ES_VENDEDOR) */
export class NoEsVendedorError extends Error {
  constructor() {
    super("Solo los vendedores pueden solicitar la verificación");
    this.name = "NoEsVendedorError";
  }
}

/** Error de dominio: ya existe una solicitud PENDING para el vendedor. (409 SOLICITUD_YA_PENDIENTE) */
export class SolicitudYaPendienteError extends Error {
  constructor() {
    super("Ya tenés una solicitud de verificación pendiente de revisión");
    this.name = "SolicitudYaPendienteError";
  }
}

/** Error de dominio: la solicitud de verificación no existe. (404 SOLICITUD_NO_ENCONTRADA) */
export class SolicitudNoEncontradaError extends Error {
  constructor() {
    super("La solicitud de verificación no existe");
    this.name = "SolicitudNoEncontradaError";
  }
}

/** Error de dominio: quien opera no es admin ni el vendedor dueño. (403 SIN_PERMISO) */
export class SinPermisoVerificacionError extends Error {
  constructor() {
    super("No tenés permiso para administrar verificaciones");
    this.name = "SinPermisoVerificacionError";
  }
}

/** Error de dominio: la solicitud ya fue revisada (no está PENDING). (409 SOLICITUD_YA_REVISADA) */
export class SolicitudYaRevisadaError extends Error {
  constructor() {
    super("Esta solicitud ya fue revisada");
    this.name = "SolicitudYaRevisadaError";
  }
}

/** Error de dominio: se rechaza la solicitud sin motivo. (422 MOTIVO_RECHAZO_REQUERIDO) */
export class MotivoRechazoRequeridoError extends Error {
  constructor() {
    super("El motivo de rechazo es obligatorio para rechazar la solicitud");
    this.name = "MotivoRechazoRequeridoError";
  }
}

/** Normaliza una URL: vacío o solo espacios pasa a null (RF-32). */
function normalizarUrl(url: string | null | undefined): string | null {
  return url != null && url.trim() !== "" ? url.trim() : null;
}

/**
 * Solicita la verificación de un vendedor (RF-32, self-service). Valida que
 * el usuario tenga accountType SELLER o BOTH y que no exista una solicitud
 * PENDING previa. En la MISMA transacción crea la SolicitudVerificacion y
 * pasa el Profile a sellerVerified = PENDING (upsert por si el vendedor no
 * tiene Profile). El campo en producción es enum VerificationStatus.
 * La notificación al vendedor corre FUERA de la tx (best-effort).
 */
export async function solicitarVerificacion({
  vendedorId,
  dniUrl,
  domicilioUrl,
}: {
  vendedorId: string;
  dniUrl?: string | null;
  domicilioUrl?: string | null;
}): Promise<{ id: string; estado: string }> {
  const usuario = await prisma.user.findUnique({
    where: { id: vendedorId },
    select: { accountType: true },
  });
  if (
    !usuario ||
    (usuario.accountType !== "SELLER" && usuario.accountType !== "BOTH")
  ) {
    throw new NoEsVendedorError();
  }

  const solicitudPendiente = await prisma.solicitudVerificacion.findFirst({
    where: { vendedorId, estado: "PENDING" },
    select: { id: true },
  });
  if (solicitudPendiente) {
    throw new SolicitudYaPendienteError();
  }

  const dniUrlFinal = normalizarUrl(dniUrl);
  const domicilioUrlFinal = normalizarUrl(domicilioUrl);

  const solicitud = await prisma.$transaction(async (tx) => {
    const creada = await tx.solicitudVerificacion.create({
      data: {
        vendedorId,
        dniUrl: dniUrlFinal,
        domicilioUrl: domicilioUrlFinal,
      },
      select: { id: true },
    });

    await tx.profile.upsert({
      where: { userId: vendedorId },
      create: { userId: vendedorId, sellerVerified: "PENDING" },
      update: { sellerVerified: "PENDING" },
      select: { id: true },
    });

    return creada;
  });

  // Notificación best-effort post-commit: un fallo nunca revierte la solicitud.
  try {
    await crearNotificacion(
      vendedorId,
      null,
      "Solicitud de verificación recibida",
      "Recibimos tu solicitud de verificación. Un administrador la revisará en breve.",
      "GENERAL",
      { evento: "verificacion", estado: "PENDING" }
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  return { id: solicitud.id, estado: "PENDING" };
}

/**
 * Estado de verificación del vendedor logueado y su solicitud más reciente
 * (RF-32). Los documentos (dniUrl/domicilioUrl) NO se exponen al vendedor
 * (RNF-15): solo los ve el admin en el panel de revisión.
 */
export async function obtenerMiVerificacion(vendedorId: string): Promise<{
  estado: string;
  solicitud: {
    id: string;
    estadoSolicitud: string;
    motivoRechazo: string | null;
    createdAt: Date;
    revisadoAt: Date | null;
  } | null;
}> {
  const [perfil, solicitud] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: vendedorId },
      select: { sellerVerified: true },
    }),
    prisma.solicitudVerificacion.findFirst({
      where: { vendedorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        estado: true,
        motivoRechazo: true,
        createdAt: true,
        revisadoAt: true,
      },
    }),
  ]);

  return {
    estado: perfil?.sellerVerified ?? "NONE",
    solicitud: solicitud
      ? {
          id: solicitud.id,
          estadoSolicitud: solicitud.estado,
          motivoRechazo: solicitud.motivoRechazo,
          createdAt: solicitud.createdAt,
          revisadoAt: solicitud.revisadoAt,
        }
      : null,
  };
}

/** Una solicitud de verificación del panel admin (solo admin, RNF-15). */
export type SolicitudVerificacionAdmin = {
  id: string;
  vendedor: { name: string | null; email: string | null };
  dniUrl: string | null;
  domicilioUrl: string | null;
  estado: SolicitudVerificacionEstado;
  motivoRechazo: string | null;
  adminId: string | null;
  adminNombre: string | null;
  revisadoAt: Date | null;
  createdAt: Date;
};

/** Detalle de UNA solicitud para el panel admin (RF-33, solo admin). */
export type SolicitudVerificacionDetalle = SolicitudVerificacionAdmin;

/** Mapea una fila de SolicitudVerificacion al contrato del panel admin. */
function mapearSolicitudAdmin(
  solicitud: {
    id: string;
    dniUrl: string | null;
    domicilioUrl: string | null;
    estado: SolicitudVerificacionEstado;
    motivoRechazo: string | null;
    adminId: string | null;
    revisadoAt: Date | null;
    createdAt: Date;
    vendedor: { name: string | null; email: string | null };
    admin: { name: string | null } | null;
  }
): SolicitudVerificacionAdmin {
  return {
    id: solicitud.id,
    vendedor: {
      name: solicitud.vendedor.name,
      email: solicitud.vendedor.email,
    },
    dniUrl: solicitud.dniUrl,
    domicilioUrl: solicitud.domicilioUrl,
    estado: solicitud.estado,
    motivoRechazo: solicitud.motivoRechazo,
    adminId: solicitud.adminId,
    adminNombre: solicitud.admin?.name ?? null,
    revisadoAt: solicitud.revisadoAt,
    createdAt: solicitud.createdAt,
  };
}

/** Resultado paginado del listado del panel admin (RF-37). */
export type ResultadoSolicitudesVerificacion = {
  solicitudes: SolicitudVerificacionAdmin[];
  total: number;
  pagina: number;
  tamanioPagina: number;
  totalPaginas: number;
};

/** Tamaño máximo de página aceptado por el listado admin (RF-37). */
export const TAMANIO_PAGINA_VERIFICACIONES = 10;

/**
 * Lista las solicitudes de verificación para el panel admin (RF-33/RF-37),
 * de la más reciente a la más antigua, con el vendedor y el admin que revisó.
 * Incluye los documentos (dniUrl/domicilioUrl), que solo son visibles aquí
 * (RNF-15). Filtra por estado opcionalmente. Devuelve la página pedida junto
 * con el total sin paginar; `page < 1` se normaliza a 1 y `totalPaginas` es
 * siempre >= 1. El count y el findMany se resuelven en paralelo.
 */
export async function listarSolicitudesVerificacion({
  adminId,
  estado,
  page,
  limit,
}: {
  adminId: string;
  estado?: string;
  page?: number;
  limit?: number;
}): Promise<ResultadoSolicitudesVerificacion> {
  const esAdmin = await esAdministrador(adminId);
  if (!esAdmin) {
    throw new SinPermisoVerificacionError();
  }

  const pagina = Math.max(1, page ?? 1);
  const tamanioPagina = Math.min(50, Math.max(1, limit ?? TAMANIO_PAGINA_VERIFICACIONES));
  const where = estado
    ? { estado: estado as SolicitudVerificacionEstado }
    : {};

  const [solicitudes, total] = await Promise.all([
    prisma.solicitudVerificacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * tamanioPagina,
      take: tamanioPagina,
      include: {
        vendedor: { select: { name: true, email: true } },
        admin: { select: { name: true } },
      },
    }),
    prisma.solicitudVerificacion.count({ where }),
  ]);

  return {
    solicitudes: solicitudes.map((solicitud) => mapearSolicitudAdmin(solicitud)),
    total,
    pagina,
    tamanioPagina,
    totalPaginas: Math.max(1, Math.ceil(total / tamanioPagina)),
  };
}

/**
 * Devuelve UNA solicitud de verificación para el detalle del panel admin
 * (RF-33), incluyendo los documentos adjuntos (dniUrl/domicilioUrl), que solo
 * se exponen en el panel (RNF-15). Valida que quien consulta sea admin y lanza
 * SolicitudNoEncontradaError si la solicitud no existe.
 */
export async function obtenerSolicitudVerificacionDetalle({
  adminId,
  solicitudId,
}: {
  adminId: string;
  solicitudId: string;
}): Promise<SolicitudVerificacionDetalle> {
  const esAdmin = await esAdministrador(adminId);
  if (!esAdmin) {
    throw new SinPermisoVerificacionError();
  }

  const solicitud = await prisma.solicitudVerificacion.findUnique({
    where: { id: solicitudId },
    include: {
      vendedor: { select: { name: true, email: true } },
      admin: { select: { name: true } },
    },
  });
  if (!solicitud) {
    throw new SolicitudNoEncontradaError();
  }

  return mapearSolicitudAdmin(solicitud);
}

/**
 * Aprueba o rechaza una solicitud de verificación (RF-33, solo admin). Dentro
 * de la MISMA transacción revisa la solicitud (estado APPROVED/REJECTED,
 * adminId, revisadoAt y motivo de rechazo) y actualiza el Profile del vendedor
 * a VERIFIED o REJECTED (upsert por si el vendedor no tiene Profile). El
 * motivo es obligatorio al rechazar. La notificación al vendedor corre FUERA
 * de la tx (best-effort).
 */
export async function revisarSolicitudVerificacion({
  adminId,
  solicitudId,
  aprobar,
  motivoRechazo,
}: {
  adminId: string;
  solicitudId: string;
  aprobar: boolean;
  motivoRechazo?: string | null;
}): Promise<{ id: string; estado: string }> {
  const esAdmin = await esAdministrador(adminId);
  if (!esAdmin) {
    throw new SinPermisoVerificacionError();
  }

  let motivoFinal: string | null = null;
  if (!aprobar) {
    const trimeado = motivoRechazo?.trim() ?? "";
    if (trimeado === "") {
      throw new MotivoRechazoRequeridoError();
    }
    motivoFinal = trimeado;
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitudVerificacion.findUnique({
      where: { id: solicitudId },
      select: { id: true, vendedorId: true, estado: true },
    });
    if (!solicitud) {
      throw new SolicitudNoEncontradaError();
    }
    if (solicitud.estado !== "PENDING") {
      throw new SolicitudYaRevisadaError();
    }

    const actualizada = await tx.solicitudVerificacion.update({
      where: { id: solicitudId },
      data: {
        estado: aprobar ? "APPROVED" : "REJECTED",
        adminId,
        revisadoAt: new Date(),
        motivoRechazo: aprobar ? null : motivoFinal,
      },
      select: { id: true },
    });

    await tx.profile.upsert({
      where: { userId: solicitud.vendedorId },
      create: {
        userId: solicitud.vendedorId,
        sellerVerified: aprobar ? "VERIFIED" : "REJECTED",
      },
      update: { sellerVerified: aprobar ? "VERIFIED" : "REJECTED" },
      select: { id: true },
    });

    return {
      id: actualizada.id,
      vendedorId: solicitud.vendedorId,
      estado: aprobar ? ("APPROVED" as const) : ("REJECTED" as const),
    };
  });

  // Notificación best-effort post-commit: un fallo nunca revierte la revisión.
  try {
    await crearNotificacion(
      resultado.vendedorId,
      null,
      resultado.estado === "APPROVED"
        ? "Verificación aprobada"
        : "Solicitud de verificación rechazada",
      resultado.estado === "APPROVED"
        ? "Tu cuenta de vendedor fue verificada. El badge de verificación ya está activo."
        : `Tu solicitud de verificación fue rechazada. Motivo: ${motivoFinal}.`,
      "GENERAL",
      { evento: "verificacion", estado: resultado.estado }
    );
  } catch {
    // La notificación es complementaria: se ignora el error silenciosamente.
  }

  return { id: resultado.id, estado: resultado.estado };
}