import { z } from "zod";

/**
 * Imagen ya subida a Cloudinary y lista para asociarse a una publicación.
 */
export const imagenPublicacionSchema = z.object({
  url: z.string().url("La URL de la imagen no es válida"),
  publicId: z.string().min(1, "El identificador de la imagen es obligatorio"),
  alt: z
    .string()
    .max(200, "El texto alternativo es demasiado largo")
    .optional(),
});

export type ImagenPublicacionInput = z.infer<typeof imagenPublicacionSchema>;

/**
 * Schema de creación de una publicación. Las imágenes son opcionales en el
 * schema base para permitir guardar borradores sin fotos.
 */
export const crearPublicacionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "El título debe tener entre 5 y 120 caracteres")
    .max(120, "El título debe tener entre 5 y 120 caracteres"),
  description: z
    .string()
    .trim()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(5000, "La descripción no puede superar los 5000 caracteres"),
  price: z
    .number({ message: "El precio es obligatorio" })
    .positive("El precio debe ser mayor a 0")
    .refine(
      (valor) =>
        Number.isFinite(valor) &&
        Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6,
      "El precio no puede tener más de 2 decimales"
    ),
  currency: z.enum(["ARS", "USD"], {
    message: "La moneda debe ser ARS o USD",
  }),
  condition: z.enum(["NEW", "USED"], {
    message: "La condición debe ser Nuevo o Usado",
  }),
  stock: z
    .number({ message: "La cantidad de stock es obligatoria" })
    .int("La cantidad debe ser un número entero")
    .min(1, "La cantidad debe ser al menos 1 unidad")
    .max(9999, "La cantidad no puede superar las 9999 unidades")
    .default(1),
  categoryId: z.uuid("Selecciona una categoría válida"),
  province: z
    .string()
    .trim()
    .min(2, "La provincia es obligatoria")
    .max(80, "El nombre de la provincia es demasiado largo"),
  city: z
    .string()
    .trim()
    .max(100, "El nombre de la ciudad es demasiado largo")
    .optional()
    .transform((valor) => (valor && valor.trim() ? valor : undefined)),
  imagenes: z
    .array(imagenPublicacionSchema)
    .max(8, "Máximo 8 imágenes por publicación")
    .optional(),
});

export type CrearPublicacionInput = z.infer<typeof crearPublicacionSchema>;

/**
 * Schema de filtros para el listado y la búsqueda de publicaciones.
 * Los valores llegan como texto (searchParams) y se convierten al tipado
 * esperado antes de consultar la base de datos.
 */
export const busquedaSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120, "El término de búsqueda es demasiado largo")
    .optional(),
  categoria: z.uuid("La categoría no es válida").optional(),
  provincia: z.string().trim().max(80, "La provincia no es válida").optional(),
  minPrecio: z.coerce
    .number({ message: "El precio mínimo no es válido" })
    .nonnegative("El precio mínimo no puede ser negativo")
    .optional(),
  maxPrecio: z.coerce
    .number({ message: "El precio máximo no es válido" })
    .nonnegative("El precio máximo no puede ser negativo")
    .optional(),
  orden: z
    .enum(["recientes", "precio-asc", "precio-desc"], {
      message: "El orden no es válido",
    })
    .default("recientes"),
  pagina: z.coerce
    .number({ message: "El número de página no es válido" })
    .int()
    .positive("El número de página no es válido")
    .optional(),
});

export type BusquedaInput = z.infer<typeof busquedaSchema>;
