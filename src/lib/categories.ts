import { prisma } from "@/lib/db/prisma";

/**
 * Devuelve las categorías de nivel superior (sin padre) ordenadas por
 * sortOrder, incluyendo sus subcategorías.
 */
export async function obtenerCategoriasRaiz() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      children: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/**
 * Devuelve una categoría por slug, incluyendo sus subcategorías ordenadas.
 * Retorna null si la categoría no existe.
 */
export async function obtenerCategoriaPorSlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
