import { z } from "zod";

/**
 * Schema de creación de un reporte sobre una publicación. El motivo se
 * corresponde con el enum ReportReason de la base de datos.
 */
export const crearReporteSchema = z.object({
  listingId: z.uuid("Selecciona una publicación válida"),
  razon: z.enum(["SPAM", "INAPPROPRIATE", "FRAUD", "DUPLICATE", "OTHER"], {
    message: "Selecciona un motivo válido",
  }),
  detalles: z
    .string()
    .trim()
    .max(2000, "Los detalles son demasiado largos")
    .optional(),
});

export type CrearReporteInput = z.infer<typeof crearReporteSchema>;

/**
 * Schema del cuerpo del PATCH de un reporte: solo permite cambiar el estado
 * a uno de los valores del enum ReportStatus.
 */
export const actualizarEstadoReporteSchema = z.object({
  estado: z.enum(["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"], {
    message: "El estado del reporte no es válido",
  }),
});

export type ActualizarEstadoReporteInput = z.infer<
  typeof actualizarEstadoReporteSchema
>;