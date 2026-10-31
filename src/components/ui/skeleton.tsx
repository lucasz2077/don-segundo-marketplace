import type { HTMLAttributes } from "react";
import { unirClases } from "./unir-clases";

/**
 * Esqueleto de carga (E3 del design): bloque gris con pulso sutil que
 * respeta `prefers-reduced-motion` (sin animación si el usuario la reduce).
 * Se combina con utilidades de tamaño (p. ej. `h-9 w-48`) según el contenido
 * que reemplaza.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={unirClases("rounded-control bg-brand-100 motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
