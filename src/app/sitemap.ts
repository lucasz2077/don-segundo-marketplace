import type { MetadataRoute } from "next";

import { obtenerCategoriasRaiz } from "@/lib/categories";
import { obtenerPublicacionesParaSitemap } from "@/lib/listings";
import { urlSitio } from "@/lib/seo";

// Se arma en cada pedido (lee la base); no se genera en el build.
export const dynamic = "force-dynamic";

/**
 * Sitemap para buscadores (RNF-12): inicio, listado, categorías y
 * publicaciones activas. Si la base no responde, devuelve al menos las
 * páginas fijas en lugar de fallar.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSitio();
  const fijas: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/listados`, changeFrequency: "hourly", priority: 0.9 },
  ];

  try {
    const [categorias, publicaciones] = await Promise.all([
      obtenerCategoriasRaiz(),
      obtenerPublicacionesParaSitemap(),
    ]);
    const slugs = categorias.flatMap((categoria) => [
      categoria.slug,
      ...categoria.children.map((hija) => hija.slug),
    ]);
    return [
      ...fijas,
      ...slugs.map((slug) => ({
        url: `${base}/categorias/${slug}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...publicaciones.map((publicacion) => ({
        url: `${base}/listados/${publicacion.id}`,
        lastModified: publicacion.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("SITEMAP_SIN_BASE", error instanceof Error ? error.name : "desconocido");
    return fijas;
  }
}
