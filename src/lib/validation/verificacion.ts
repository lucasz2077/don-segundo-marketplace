import { z } from "zod";

/**
 * Schema de creación de una solicitud de verificación (RF-32, RNF-15). Se
 * envían los public_id de los documentos ya subidos como assets privados por
 * POST /api/verificaciones/documentos (nunca URLs públicas). El de identidad
 * es obligatorio; el de domicilio, opcional. La titularidad la valida el
 * service.
 */
export const crearSolicitudVerificacionSchema = z.object({
  dniPublicId: z
    .string({ message: "Subí tu documento de identidad" })
    .trim()
    .min(1, "Subí tu documento de identidad")
    .max(300, "El identificador del documento de identidad no es válido"),
  domicilioPublicId: z
    .string()
    .trim()
    .min(1, "El identificador del documento de domicilio no es válido")
    .max(300, "El identificador del documento de domicilio no es válido")
    .optional(),
});

/** Tipos de documento de una solicitud de verificación. */
export const tipoDocumentoVerificacionSchema = z.enum(["dni", "domicilio"], {
  message: "El tipo de documento no es válido",
});

export type TipoDocumentoVerificacion = z.infer<typeof tipoDocumentoVerificacionSchema>;

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