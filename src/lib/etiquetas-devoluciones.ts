import type { SolicitudDevolucionEstado } from "@/generated/prisma/client";

/** Etiquetas en español para cada estado de una solicitud de devolución
 * (RF-49..RF-51). Módulo sin dependencias de servidor para poder usarse
 * también en componentes client si hace falta. */
export const etiquetasEstadoDevolucion: Record<
  SolicitudDevolucionEstado,
  string
> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

/** Clases Tailwind del badge de estado de una solicitud de devolución
 * (5.4): mismos tonos semánticos que los badges de verificaciones
 * (amber/success/danger con tinta suave, contraste AA sobre white/bone). */
export const clasesBadgeEstadoDevolucion: Record<
  SolicitudDevolucionEstado,
  string
> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-success/15 text-success",
  RECHAZADA: "bg-danger/15 text-danger",
};