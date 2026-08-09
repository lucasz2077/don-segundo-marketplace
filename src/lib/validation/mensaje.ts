import { z } from "zod";

/**
 * Schema para iniciar una conversación desde el detalle de una publicación.
 * El contacto siempre comienza con un mensaje vía plataforma (RF-19).
 */
export const crearConversacionSchema = z.object({
  listingId: z.uuid("Selecciona una publicación válida"),
  mensaje: z
    .string()
    .trim()
    .min(1, "El mensaje no puede estar vacío")
    .max(2000, "El mensaje es demasiado largo"),
});

export type CrearConversacionInput = z.infer<typeof crearConversacionSchema>;

/**
 * Schema para enviar un mensaje dentro de una conversación existente.
 */
export const enviarMensajeSchema = z.object({
  mensaje: z
    .string()
    .trim()
    .min(1, "El mensaje no puede estar vacío")
    .max(2000, "El mensaje es demasiado largo"),
});

export type EnviarMensajeInput = z.infer<typeof enviarMensajeSchema>;
