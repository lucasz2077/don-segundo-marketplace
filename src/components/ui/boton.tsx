import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "peligro" | "texto";

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Variante visual del botón (E6 del design). Por defecto: primario. */
  variante?: Variante;
  /** Estado de carga: deshabilita el botón y muestra el texto alternativo. */
  cargando?: boolean;
};

const estilosPorVariante: Record<Variante, string> = {
  primario:
    "bg-brand-700 text-white hover:bg-brand-600",
  secundario:
    "border border-brand-300 bg-white text-brand-700 hover:bg-brand-50",
  peligro: "bg-danger text-white hover:opacity-90",
  texto: "text-brand-700 underline hover:text-brand-900",
};

/**
 * Botón primitivo del design system (E1/E3/E6): variantes (primario,
 * secundario, peligro, texto), estado de carga y foco visible. Mientras
 * `cargando` es true queda deshabilitado y anuncia busy; el texto de carga
 * lo controla el caller (p. ej. "Enviando..."), siguiendo el patrón de
 * boton-comprar. Targets táctiles >= 44px (min-h-11, E5). Las
 * micro-interacciones respetan `prefers-reduced-motion` (motion-safe).
 */
export function Boton({
  variante = "primario",
  cargando = false,
  className = "",
  children,
  ...props
}: BotonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={cargando || props.disabled}
      aria-busy={cargando || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors ${estilosPorVariante[variante]} ${className}`}
    >
      {children}
    </button>
  );
}
