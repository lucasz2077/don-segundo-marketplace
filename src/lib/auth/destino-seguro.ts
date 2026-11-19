/** Destino por defecto después de iniciar sesión. */
export const DESTINO_POR_DEFECTO = "/listados";

/**
 * Devuelve `valor` solo si es una ruta interna del sitio ("/compras",
 * "/listados/abc?x=1"); si no, el destino por defecto. Evita la redirección
 * abierta en `/sign-in?redirect=`: rechaza URLs absolutas ("https://..."),
 * relativas al protocolo ("//sitio.com") y sus variantes con barra invertida
 * ("/\sitio.com"), que los navegadores interpretan como "//".
 */
export function destinoSeguro(valor: string | string[] | undefined | null): string {
  if (typeof valor !== "string" || valor.length === 0) {
    return DESTINO_POR_DEFECTO;
  }
  // Caracteres de control o espacios: los navegadores los ignoran al
  // interpretar la URL y permiten armar "/\t/sitio.com".
  if (/[\u0000-\u001f\u007f\s]/.test(valor)) {
    return DESTINO_POR_DEFECTO;
  }
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return DESTINO_POR_DEFECTO;
  }
  if (valor.includes("\\")) {
    return DESTINO_POR_DEFECTO;
  }
  return valor;
}
