/**
 * Une clases de Tailwind descartando valores vacíos o falsos, para armar
 * `className` condicionales sin plantillas con espacios sueltos. No resuelve
 * conflictos entre utilidades: el `className` del caller extiende la base,
 * no la reemplaza.
 */
export function unirClases(
  ...clases: Array<string | false | null | undefined>
): string {
  return clases.filter(Boolean).join(" ");
}
