import { z } from "zod";

/**
 * Solicitud de devolución de una compra (RF-49): compraId uuid y motivo de
 * 10 a 500 caracteres (recortado). Mensajes en español, estilo rating.ts.
 */
export const solicitarDevolucionSchema = z.object({
  compraId: z.uuid("Selecciona una compra válida"),
  motivo: z
    .string({ message: "Escribe un motivo" })
    .trim()
    .min(10, "El motivo debe tener al menos 10 caracteres")
    .max(500, "El motivo es demasiado largo"),
});

export type SolicitarDevolucionInput = z.infer<typeof solicitarDevolucionSchema>;

/**
 * Resolución de una solicitud de devolución por el vendedor (RF-49):
 * `accion` es aprobar|rechazar; `motivoRechazo` (≤500) es OBLIGATORIO al
 * rechazar. SuperRefine implementa la dependencia entre campos.
 */
export const resolverDevolucionSchema = z
  .object({
    accion: z.enum(["aprobar", "rechazar"], {
      message: "Selecciona aprobar o rechazar",
    }),
    motivoRechazo: z
      .string()
      .trim()
      .max(500, "El motivo de rechazo es demasiado largo")
      .optional(),
  })
  .superRefine((datos, ctx) => {
    if (datos.accion === "rechazar" && !datos.motivoRechazo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivoRechazo"],
        message: "Indica el motivo de rechazo",
      });
    }
  });

export type ResolverDevolucionInput = z.infer<typeof resolverDevolucionSchema>;

/**
 * Notificación de Mercado Pago (RF-46): el body real trae más campos
 * (action, api_version, live_mode...), pero solo importan `type` y
 * `data.id`. `data.id` se normaliza a string (MP puede enviarlo como
 * número). Pretransform: si data.id viene como número/string, se fuerza
 * a string sin romper el parseo.
 */
export const webhookPagoSchema = z.object({
  type: z.string().optional(),
  data: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
  }),
});

export type WebhookPagoInput = z.infer<typeof webhookPagoSchema>;