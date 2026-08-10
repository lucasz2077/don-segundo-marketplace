import { z } from "zod";

/**
 * Schema de una dirección de envío/entrega. La calle incluye el número
 * (p.ej. "Av. Siempre Viva 742"); pisoDepto y referencia son opcionales.
 */
export const direccionSchema = z.object({
  calle: z
    .string()
    .trim()
    .min(2, "La calle es obligatoria")
    .max(200, "La calle es demasiado larga"),
  ciudad: z
    .string()
    .trim()
    .min(2, "La ciudad es obligatoria")
    .max(100, "El nombre de la ciudad es demasiado largo"),
  provincia: z
    .string()
    .trim()
    .min(2, "La provincia es obligatoria")
    .max(80, "El nombre de la provincia es demasiado largo"),
  codigoPostal: z
    .string()
    .trim()
    .min(1, "El código postal es obligatorio")
    .max(12, "El código postal es demasiado largo"),
  pisoDepto: z
    .string()
    .trim()
    .max(50, "El piso/departamento es demasiado largo")
    .optional()
    .transform((valor) => (valor && valor.trim() ? valor : undefined)),
  referencia: z
    .string()
    .trim()
    .max(200, "La referencia es demasiado larga")
    .optional()
    .transform((valor) => (valor && valor.trim() ? valor : undefined)),
  esPredeterminada: z.boolean().optional().default(false),
});

export type DireccionInput = z.infer<typeof direccionSchema>;