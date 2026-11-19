import type { MetadataRoute } from "next";

import { urlSitio } from "@/lib/seo";

/** RNF-12: los buscadores indexan lo público y no las páginas privadas. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/perfil",
        "/compras",
        "/favoritos",
        "/mensajes",
        "/notificaciones",
        "/publicar",
        "/dashboard",
        "/pagos",
        "/recuperar-contrasenia",
        "/restablecer-contrasenia",
        "/sistema-de-disenio",
      ],
    },
    sitemap: `${urlSitio()}/sitemap.xml`,
  };
}
