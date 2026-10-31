import { cache } from "react";
import { obtenerCategoriasRaiz } from "@/lib/categories";
import type { CategoriaNavegacion } from "./tipos";

/**
 * Categorías para el header y el footer, deduplicadas por request (ambos las
 * piden en el mismo render). Si la consulta falla, la navegación se muestra
 * sin categorías en lugar de romper el layout raíz de todas las páginas.
 */
export const obtenerCategoriasNavegacion = cache(
  async (): Promise<CategoriaNavegacion[]> => {
    try {
      const categorias = await obtenerCategoriasRaiz();
      return categorias.map(({ id, name, slug, children }) => ({
        id,
        name,
        slug,
        children: children.map((hija) => ({ id: hija.id, name: hija.name, slug: hija.slug })),
      }));
    } catch (error) {
      console.error("No se pudieron cargar las categorías de navegación", error);
      return [];
    }
  },
);
