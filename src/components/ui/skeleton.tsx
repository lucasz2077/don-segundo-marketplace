import type { HTMLAttributes } from "react";

/**
 * Esqueleto de carga (E3 del design): bloque gris con pulso sutil que
 * respeta `prefers-reduced-motion`. Se combina con utilidades de tamaño
 * (p. ej. `h-9 w-48`) según el contenido que reemplaza.
 */
export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-brand-100 motion-safe:animate-pulse ${className}`}
      {...props}
    />
  );
}