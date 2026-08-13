import { z } from "zod";

/**
 * Schema de edición del perfil público propio (bio y businessName).
 * `.strict()` rechaza cualquier clave extra (por ejemplo `userId`), lo que
 * garantiza que el dueño siempre es `session.user.id` y no se puede apuntar
 * al perfil de otro usuario (REQ-9 propiedad). Los campos en blanco se
 * transforman a null (borrar el valor); los ausentes no se tocan.
 */
export const actualizarPerfilPublicoSchema = z
  .object({
    bio: z
      .string()
      .trim()
      .max(500, "La bio es demasiado larga")
      .transform((valor) => (valor === "" ? null : valor))
      .optional(),
    businessName: z
      .string()
      .trim()
      .max(80, "El nombre comercial es demasiado largo")
      .transform((valor) => (valor === "" ? null : valor))
      .optional(),
  })
  .strict();

export type ActualizarPerfilInput = z.infer<typeof actualizarPerfilPublicoSchema>;