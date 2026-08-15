import { z } from "zod";

/**
 * Schema de creación de una solicitud de verificación (RF-32). La
 * documentación de identidad es obligatoria (`dniUrl`); la de domicilio es
 * opcional. Ambas son URLs (se esperan referencias a Cloudinary) recortadas y
 * con tope de 500 caracteres.
 */
export const crearSolicitudVerificacionSchema = z.object({
  dniUrl: z
    .string()
    .trim()
    .url("La URL del documento de identidad no es válida")
    .max(500, "La URL del documento de identidad es demasiado larga"),
  domicilioUrl: z
    .string()
    .trim()
    .url("La URL del documento de domicilio no es válida")
    .max(500, "La URL del documento de domicilio es demasiado larga")
    .optional(),
});

export type CrearSolicitudVerificacionInput = z.infer<
  typeof crearSolicitudVerificacionSchema
>;

/**
 * Schema del cuerpo del PATCH de una solicitud de verificación (RF-33). El
 * motivo de rechazo es opcional en el cuerpo de la petición: el service lo
 * exige (y lo trimea) cuando `aprobar` es false.
 */
export const revisarSolicitudSchema = z.object({
  aprobar: z.boolean({ message: "Selecciona si se aprueba o se rechaza" }),
  motivoRechazo: z
    .string()
    .trim()
    .max(500, "El motivo de rechazo es demasiado largo")
    .optional()
    .nullable(),
});

export type RevisarSolicitudInput = z.infer<typeof revisarSolicitudSchema>;

/**
 * Estados de solicitud aceptados como filtro del listado del panel admin.
 */
export const estadoSolicitudSchema = z.enum(
  ["PENDING", "APPROVED", "REJECTED"],
  {
    message: "El estado de la solicitud no es válido",
  }
);

/**
 * Query params del listado admin (RF-37). `page` se coercea a entero SIN
 * `min(1)`: la normalización de page < 1 a 1 la hace el service (spec edge).
 * `limit` se acota a 1..50 con default 10. Un fallo de parse responde 400
 * CUERPO_INVALIDO (decisión 4a).
 */
export const listadoAdminSchema = z.object({
  estado: estadoSolicitudSchema.optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ListadoAdminInput = z.infer<typeof listadoAdminSchema>;