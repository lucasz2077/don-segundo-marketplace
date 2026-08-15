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