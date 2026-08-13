import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { eliminarImagen } from "@/lib/cloudinary";
import { notificarFavoritosCambioPublicacion } from "@/lib/notificaciones";
import type { CrearPublicacionInput } from "@/lib/validation/listing";

/** Cantidad de publicaciones por página en listados y búsquedas. */
export const TAMANIO_PAGINA = 12;

export type OrdenPublicaciones = "recientes" | "precio-asc" | "precio-desc";

export type FiltrosPublicaciones = {
  busqueda?: string;
  categoria?: string;
  provincia?: string;
  minPrecio?: number;
  maxPrecio?: number;
  orden?: OrdenPublicaciones;
  pagina?: number;
};

/** Error de dominio: la categoría indicada no existe en la base. */
export class CategoriaInvalidaError extends Error {
  constructor() {
    super("La categoría seleccionada no es válida");
    this.name = "CategoriaInvalidaError";
  }
}

const seleccionPropietario = { id: true, name: true } as const;

const incluirDependencias = {
  images: { orderBy: { position: "asc" as const } },
  category: true,
  owner: { select: seleccionPropietario },
} as const;

/**
 * Lista las publicaciones activas con filtros combinables, búsqueda fulltext
 * (índice GIN sobre tsvector en español) y paginación simple.
 */
export async function obtenerPublicacionesActivas(
  filtros: FiltrosPublicaciones = {}
) {
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const condiciones: Prisma.Sql[] = [
    Prisma.sql`"status" = 'ACTIVE'`,
    Prisma.sql`"deletedAt" IS NULL`,
  ];

  if (filtros.categoria) {
    condiciones.push(Prisma.sql`"categoryId" = ${filtros.categoria}`);
  }
  if (filtros.provincia) {
    condiciones.push(Prisma.sql`"province" = ${filtros.provincia}`);
  }
  if (filtros.minPrecio !== undefined) {
    condiciones.push(Prisma.sql`"price" >= ${filtros.minPrecio}`);
  }
  if (filtros.maxPrecio !== undefined) {
    condiciones.push(Prisma.sql`"price" <= ${filtros.maxPrecio}`);
  }

  const busqueda = filtros.busqueda?.trim();
  if (busqueda) {
    // plainto_tsquery sanitiza el texto del usuario y nunca lanza error de
    // sintaxis; el índice GIN de "Listing" se usa para evaluar el @@.
    condiciones.push(
      Prisma.sql`to_tsvector('spanish', coalesce("title", '') || ' ' || coalesce("description", '')) @@ plainto_tsquery('spanish', ${busqueda})`
    );
  }

  const where = Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}`;

  const ordenSql =
    filtros.orden === "precio-asc"
      ? Prisma.sql`"price" ASC, "publishedAt" DESC`
      : filtros.orden === "precio-desc"
        ? Prisma.sql`"price" DESC, "publishedAt" DESC`
        : Prisma.sql`"publishedAt" DESC, "createdAt" DESC`;

  const [filasIds, conteo] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "Listing" ${where}
        ORDER BY ${ordenSql}
        LIMIT ${TAMANIO_PAGINA} OFFSET ${(pagina - 1) * TAMANIO_PAGINA}`
    ),
    prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`SELECT COUNT(*) AS "total" FROM "Listing" ${where}`
    ),
  ]);

  const total = Number(conteo[0]?.total ?? 0);
  const ids = filasIds.map((fila) => fila.id);

  const publicaciones =
    ids.length > 0
      ? await prisma.listing.findMany({
          where: { id: { in: ids } },
          include: incluirDependencias,
        })
      : [];

  // findMany no garantiza el orden del IN; se reordena según el SQL.
  const porId = new Map(publicaciones.map((publicacion) => [publicacion.id, publicacion]));
  const ordenadas = ids
    .map((id) => porId.get(id))
    .filter((publicacion): publicacion is NonNullable<typeof publicacion> =>
      Boolean(publicacion)
    );

  return {
    publicaciones: ordenadas,
    total,
    pagina,
    tamanioPagina: TAMANIO_PAGINA,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANIO_PAGINA)),
  };
}

/**
 * Devuelve una publicación activa por id para el detalle público e
 * incrementa su contador de vistas (salvo que quien la consulta sea su
 * propietario). Retorna null si no existe o fue eliminada (soft delete).
 */
export async function obtenerPublicacionPorId(id: string, userId?: string) {
  const publicacion = await obtenerPublicacion(id);
  if (!publicacion || publicacion.deletedAt || publicacion.status === "DELETED") {
    return null;
  }
  // Las vistas propias no cuentan: evita inflar el contador cuando el dueño
  // revisa su propia publicación.
  if (userId === publicacion.ownerId) {
    return { ...publicacion, viewCount: publicacion.viewCount };
  }
  await prisma.listing.update({
    where: { id: publicacion.id },
    data: { viewCount: { increment: 1 } },
  });
  return { ...publicacion, viewCount: publicacion.viewCount + 1 };
}

/**
 * Devuelve una publicación por id sin filtrar por estado y sin contar vistas.
 * Se usa en las rutas de gestión (editar/eliminar) para validar propiedad.
 */
export async function obtenerPublicacion(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: incluirDependencias,
  });
}

/**
 * Devuelve las últimas publicaciones activas, para la sección de recientes
 * del inicio.
 */
export async function obtenerPublicacionesRecientes(limite = 6) {
  return prisma.listing.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: { publishedAt: "desc" },
    take: limite,
    include: incluirDependencias,
  });
}

/**
 * Crea una publicación con sus imágenes. Valida que la categoría exista;
 * si no, lanza CategoriaInvalidaError.
 */
export async function crearPublicacion(
  ownerId: string,
  datos: CrearPublicacionInput
) {
  const categoria = await prisma.category.findUnique({
    where: { id: datos.categoryId },
    select: { id: true },
  });
  if (!categoria) {
    throw new CategoriaInvalidaError();
  }

  return prisma.listing.create({
    data: {
      ownerId,
      title: datos.title,
      description: datos.description,
      price: new Prisma.Decimal(datos.price.toFixed(2)),
      currency: datos.currency,
      condition: datos.condition,
      categoryId: datos.categoryId,
      province: datos.province,
      city: datos.city ?? null,
      images: {
        create: (datos.imagenes ?? []).map((imagen, indice) => ({
          url: imagen.url,
          publicId: imagen.publicId,
          position: indice,
          alt: imagen.alt?.trim() ? imagen.alt.trim() : null,
        })),
      },
    },
    include: incluirDependencias,
  });
}

/**
 * Actualiza una publicación (solo su propietario). Si el payload trae
 * imágenes, las reemplaza por completo y limpia de Cloudinary las que ya no
 * se usan. Retorna null si la publicación no existe o no pertenece al dueño.
 */
export async function actualizarPublicacion(
  id: string,
  ownerId: string,
  datos: CrearPublicacionInput
) {
  const publicacion = await prisma.listing.findFirst({
    where: { id, ownerId },
    include: { images: true },
  });
  if (!publicacion) {
    return null;
  }

  const camposBasicos = {
    title: datos.title,
    description: datos.description,
    price: new Prisma.Decimal(datos.price.toFixed(2)),
    currency: datos.currency,
    condition: datos.condition,
    categoryId: datos.categoryId,
    province: datos.province,
    city: datos.city ?? null,
  };

  const imagenesNuevas = datos.imagenes;
  let resultado;

  if (imagenesNuevas) {
    resultado = await prisma.$transaction(async (tx) => {
      await tx.listingImage.deleteMany({ where: { listingId: id } });
      return tx.listing.update({
        where: { id },
        data: {
          ...camposBasicos,
          images: {
            create: imagenesNuevas.map((imagen, indice) => ({
              url: imagen.url,
              publicId: imagen.publicId,
              position: indice,
              alt: imagen.alt?.trim() ? imagen.alt.trim() : null,
            })),
          },
        },
        include: incluirDependencias,
      });
    });

    // Solo se borran de Cloudinary las imágenes reemplazadas (best effort).
    const publicIdsMantenidos = new Set(imagenesNuevas.map((imagen) => imagen.publicId));
    await Promise.allSettled(
      publicacion.images
        .filter((imagen) => !publicIdsMantenidos.has(imagen.publicId))
        .map((imagen) => eliminarImagen(imagen.publicId))
    );
  } else {
    resultado = await prisma.listing.update({
      where: { id },
      data: camposBasicos,
      include: incluirDependencias,
    });
  }

  const precioAnterior = publicacion.price.toString();
  const precioNuevo = resultado.price.toString();

  // Si cambió el precio, se avisa a los favoritos (el dueño queda excluido
  // dentro del helper). Best-effort: no se rompe la edición ante un fallo.
  if (precioAnterior !== precioNuevo) {
    try {
      await notificarFavoritosCambioPublicacion(
        id,
        "FAVORITO_CAMBIO_PRECIO",
        {
          listingId: id,
          titulo: resultado.title,
          precioAnterior,
          precioNuevo,
        },
        "Cambió el precio de un favorito",
        `"${resultado.title}" cambió su precio de $${precioAnterior} a $${precioNuevo}.`
      );
    } catch {
      // La notificación es complementaria: se ignora el error silenciosamente.
    }
  }

  return resultado;
}

/**
 * Soft delete de una publicación: cambia su estado a DELETED y marca
 * deletedAt. Además elimina sus imágenes de Cloudinary (best effort).
 * Retorna null si la publicación no existe o no pertenece al dueño.
 */
export async function eliminarPublicacion(id: string, ownerId: string) {
  const publicacion = await prisma.listing.findFirst({
    where: { id, ownerId },
    include: { images: true },
  });
  if (!publicacion) {
    return null;
  }

  const resultado = await prisma.listing.update({
    where: { id },
    data: { status: "DELETED", deletedAt: new Date() },
    select: { id: true, status: true, deletedAt: true },
  });

  await Promise.allSettled(
    publicacion.images.map((imagen) => eliminarImagen(imagen.publicId))
  );

  return resultado;
}
