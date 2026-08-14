import { z } from "zod";

/**
 * Schema de calificación de una venta (RF-27). El puntaje es un entero entre
 * 1 y 5; el comentario es opcional, se recorta y no puede superar los 500
 * caracteres. Mensajes en español, estilo reporte.ts.
 */
export const crearRatingSchema = z.object({
  compraId: z.uuid("Selecciona una compra válida"),
  puntaje: z
    .number({ message: "Selecciona un puntaje" })
    .int("El puntaje debe ser un número entero")
    .min(1, "Mínimo 1 estrella")
    .max(5, "Máximo 5 estrellas"),
  comentario: z
    .string()
    .trim()
    .max(500, "El comentario es demasiado largo")
    .optional(),
});

export type CrearRatingInput = z.infer<typeof crearRatingSchema>;