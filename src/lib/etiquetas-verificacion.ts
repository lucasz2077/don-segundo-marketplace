import type {
  SolicitudVerificacionEstado,
  VerificationStatus,
} from "@/generated/prisma/client";

/** Etiquetas en español para cada estado de una solicitud de verificación
 * (RF-33). Módulo sin dependencias de servidor para poder usarse también en
 * componentes client si hace falta. */
export const etiquetasEstadoSolicitud: Record<
  SolicitudVerificacionEstado,
  string
> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

/** Etiquetas en español para cada estado de la verificación del vendedor
 * (RF-32). */
export const etiquetasEstadoVerificacion: Record<VerificationStatus, string> = {
  NONE: "Sin verificar",
  PENDING: "En revisión",
  VERIFIED: "Verificado",
  REJECTED: "Rechazada",
};

/** Clases Tailwind del badge de estado de una solicitud (RF-33): fondo de
 * tinta suave con texto del mismo tono oscurecido que respeta contraste AA
 * sobre white/bone. */
export const clasesBadgeEstadoSolicitud: Record<
  SolicitudVerificacionEstado,
  string
> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
};