/**
 * Utilidades de SEO y vista previa al compartir (RNF-12).
 */

export const NOMBRE_SITIO = "Don Segundo";
export const DESCRIPCION_SITIO =
  "El marketplace del campo argentino: maquinaria agrícola, herramientas, insumos, hacienda, repuestos y servicios rurales, de productor a productor.";

/** URL pública del sitio, sin barra final (NEXT_PUBLIC_APP_URL). */
export function urlSitio(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Versión de una imagen de Cloudinary recortada a 1200×630 en JPG, el formato
 * que mejor muestran WhatsApp, Facebook y X en la vista previa. Otras URLs se
 * devuelven sin cambios.
 */
export function urlImagenCompartir(url: string): string {
  try {
    const parseada = new URL(url);
    if (parseada.hostname !== "res.cloudinary.com" || !parseada.pathname.includes("/image/upload/")) {
      return url;
    }
    parseada.pathname = parseada.pathname.replace(
      "/image/upload/",
      "/image/upload/c_fill,w_1200,h_630,g_auto,f_jpg,q_auto/"
    );
    return parseada.toString();
  } catch {
    return url;
  }
}

/** Recorta un texto para meta description (~160 caracteres, sin cortar palabras). */
export function descripcionCorta(texto: string, maximo = 160): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo - 1);
  const ultimoEspacio = corte.lastIndexOf(" ");
  return `${(ultimoEspacio > maximo * 0.6 ? corte.slice(0, ultimoEspacio) : corte).trimEnd()}…`;
}
