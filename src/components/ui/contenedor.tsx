import type { HTMLAttributes } from "react";
import { unirClases } from "./unir-clases";

type EtiquetaContenedor = "div" | "main" | "section" | "header" | "footer" | "nav";

type ContenedorProps = HTMLAttributes<HTMLElement> & {
  /** Etiqueta semántica del contenedor (por defecto: div). */
  as?: EtiquetaContenedor;
};

/**
 * Ancho y márgenes laterales estándar del sitio (`max-w-sitio`, gutter de
 * 16px en mobile y 24px desde sm). Todas las páginas alinean su contenido con
 * el header a través de este contenedor.
 */
export function Contenedor({
  as: Etiqueta = "div",
  className,
  children,
  ...props
}: ContenedorProps) {
  return (
    <Etiqueta
      className={unirClases("mx-auto w-full max-w-sitio px-4 sm:px-6", className)}
      {...props}
    >
      {children}
    </Etiqueta>
  );
}
