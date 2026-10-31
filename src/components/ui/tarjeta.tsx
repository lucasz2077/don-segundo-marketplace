import type { HTMLAttributes } from "react";
import { unirClases } from "./unir-clases";

type EtiquetaTarjeta = "div" | "article" | "section" | "li" | "aside";

type TarjetaProps = HTMLAttributes<HTMLElement> & {
  /** Etiqueta semántica del contenedor (por defecto: div). */
  as?: EtiquetaTarjeta;
  /** Padding interno; "ninguno" para tarjetas con imagen a sangre. */
  relleno?: "ninguno" | "sm" | "md";
};

const rellenos = {
  ninguno: "",
  sm: "p-4",
  md: "p-6",
} as const;

/**
 * Superficie base del design system (E1): fondo blanco, borde suave, radio
 * de tarjeta y sombra mínima sobre el fondo hueso. Base única de tarjetas y
 * paneles del producto; `className` permite extender (p. ej. hover).
 */
export function Tarjeta({
  as: Etiqueta = "div",
  relleno = "md",
  className,
  children,
  ...props
}: TarjetaProps) {
  return (
    <Etiqueta
      className={unirClases(
        "rounded-card border border-linea bg-superficie shadow-card",
        rellenos[relleno],
        className,
      )}
      {...props}
    >
      {children}
    </Etiqueta>
  );
}
