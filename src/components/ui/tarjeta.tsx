import type { HTMLAttributes } from "react";

type EtiquetaTarjeta = "div" | "article" | "section" | "li";

type TarjetaProps = HTMLAttributes<HTMLElement> & {
  /** Etiqueta semántica del contenedor (por defecto: div). */
  as?: EtiquetaTarjeta;
};

/**
 * Contenedor tokenizado del design system (E1 del design): borde, fondo y
 * padding estándar para superficies. Usá `rounded-card
 * border-brand-100 bg-white p-6` como base única de las tarjetas del
 * producto. `className` permite extender (p. ej. sombras o hover).
 */
export function Tarjeta({
  as: Etiqueta = "div",
  className = "",
  children,
  ...props
}: TarjetaProps) {
  return (
    <Etiqueta
      className={`rounded-card border border-brand-100 bg-white p-6 ${className}`}
      {...props}
    >
      {children}
    </Etiqueta>
  );
}