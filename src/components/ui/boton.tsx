import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { unirClases } from "./unir-clases";

export type VarianteBoton =
  | "primario"
  | "acento"
  | "secundario"
  | "fantasma"
  | "peligro"
  | "texto";

export type TamanioBoton = "sm" | "md" | "lg";

const estilosPorVariante: Record<VarianteBoton, string> = {
  // Acción principal de la pantalla: una sola por bloque.
  primario: "bg-brand-700 text-white shadow-card hover:bg-brand-800",
  // Acción de marca de alto impacto (Publicar, Comprar).
  acento: "bg-accent-500 text-brand-950 shadow-card hover:bg-accent-400",
  secundario:
    "border border-linea-fuerte bg-superficie text-brand-700 hover:border-brand-300 hover:bg-brand-50",
  fantasma: "text-brand-700 hover:bg-brand-50",
  peligro: "bg-danger text-white shadow-card hover:bg-danger/90",
  texto:
    "text-brand-700 underline underline-offset-2 hover:text-brand-900",
};

const estilosPorTamanio: Record<TamanioBoton, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

type OpcionesEstiloBoton = {
  variante?: VarianteBoton;
  tamanio?: TamanioBoton;
  anchoCompleto?: boolean;
};

/**
 * Clases de botón compartidas entre `Boton` y `BotonEnlace`, para que un
 * enlace con forma de botón se vea idéntico a un `<button>`.
 */
export function clasesBoton({
  variante = "primario",
  tamanio = "md",
  anchoCompleto = false,
}: OpcionesEstiloBoton = {}): string {
  return unirClases(
    "inline-flex items-center justify-center gap-2 rounded-control font-semibold",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors",
    variante !== "texto" && estilosPorTamanio[tamanio],
    estilosPorVariante[variante],
    anchoCompleto && "w-full",
  );
}

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  OpcionesEstiloBoton & {
    /** Estado de carga: deshabilita el botón, muestra un spinner y anuncia busy. */
    cargando?: boolean;
  };

/**
 * Botón primitivo del design system (E1/E3/E6): variantes (primario, acento,
 * secundario, fantasma, peligro, texto), tamaños, estado de carga y foco
 * visible. Mientras `cargando` es true queda deshabilitado, muestra un
 * spinner y anuncia busy; el texto de carga lo controla el caller (p. ej.
 * "Enviando..."). En tamaño md/lg el target táctil es >= 44px (E5). Las
 * micro-interacciones respetan `prefers-reduced-motion` (motion-safe).
 */
export function Boton({
  variante = "primario",
  tamanio = "md",
  anchoCompleto = false,
  cargando = false,
  className,
  children,
  ...props
}: BotonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={cargando || props.disabled}
      aria-busy={cargando || undefined}
      className={unirClases(
        clasesBoton({ variante, tamanio, anchoCompleto }),
        className,
      )}
    >
      {cargando ? (
        <LoaderCircle
          className="size-4 shrink-0 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
