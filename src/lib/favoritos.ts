import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Error de dominio: la publicación a marcar no existe o fue eliminada. */
export class PublicacionNoDisponibleError extends Error {
  constructor() {
    super("La publicación no existe");
    this.name = "PublicacionNoDisponibleError";
  }
}

const seleccionPropietario = { id: true, name: true } as const;

const incluirDependenciasFavorito = {
  listing: {
    include: {
      images: { orderBy: { position: "asc" as const } },
      category: true,
      owner: { select: seleccionPropietario },
    },
  },
} as const;

/**
 * Lista los favoritos de un usuario ordenados por fecha de creación
 * descendente, con la publicación incluida (imágenes ordenadas, categoría y
 * propietario).
 */
export async function obtenerFavoritos(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: incluirDependenciasFavorito,
  });
}

/**
 * Marca una publicación como favorita del usuario. Valida que la publicación
 * exista y no esté eliminada (soft delete). Si el favorito ya existe, se
 * trata como éxito idempotente. Retorna el favorito.
 */
export async function agregarFavorito(userId: string, listingId: string) {
  const publicacion = await prisma.listing.findFirst({
    where: {
      id: listingId,
      deletedAt: null,
      status: { not: "DELETED" },
    },
    select: { id: true },
  });
  if (!publicacion) {
    throw new PublicacionNoDisponibleError();
  }

  try {
    return await prisma.favorite.create({
      data: { userId, listingId },
    });
  } catch (error) {
    // El par (userId, listingId) es único: si ya existía, el POST es idempotente.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.favorite.findUnique({
        where: { userId_listingId: { userId, listingId } },
      });
    }
    throw error;
  }
}

/**
 * Quita el favorito de una publicación del usuario. Devuelve true si existía
 * y fue eliminado, false en caso contrario (comportamiento idempotente).
 */
export async function quitarFavorito(userId: string, listingId: string) {
  const resultado = await prisma.favorite.deleteMany({
    where: { userId, listingId },
  });
  return resultado.count > 0;
}

/**
 * Indica si el usuario tiene marcada como favorita una publicación.
 */
export async function esFavorito(userId: string, listingId: string) {
  const favorito = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
    select: { id: true },
  });
  return Boolean(favorito);
}