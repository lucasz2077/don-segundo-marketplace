import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { unirClases } from "./unir-clases";

/**
 * Clases base de los controles de formulario. Exportadas para los casos que
 * no encajan en `Entrada`/`Selector`/`AreaTexto` (p. ej. un input de archivo
 * estilizado), así todos comparten borde, foco y estado inválido.
 */
export function clasesControl(invalido = false): string {
  return unirClases(
    "w-full rounded-control border bg-superficie px-3 py-2 text-sm text-tinta shadow-xs",
    "placeholder:text-tinta-tenue/70 motion-safe:transition-colors",
    "focus:outline-none focus:ring-2",
    "disabled:cursor-not-allowed disabled:bg-brand-50 disabled:text-tinta-tenue",
    invalido
      ? "border-danger focus:border-danger focus:ring-danger/20"
      : "border-linea-fuerte hover:border-brand-300 focus:border-brand-500 focus:ring-brand-500/20",
  );
}

/**
 * Arma el `aria-describedby` de un control según los textos que muestra su
 * `Campo` (ayuda y/o error), con los mismos ids que genera `Campo`.
 */
export function describirCampo(
  id: string,
  { ayuda, error }: { ayuda?: ReactNode; error?: ReactNode },
): string | undefined {
  const ids = [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null];
  return ids.filter(Boolean).join(" ") || undefined;
}

type CampoProps = {
  /** id del control: lo usan el label y los textos de ayuda/error. */
  id: string;
  etiqueta: ReactNode;
  /** Texto de ayuda debajo del control (formato esperado, límites). */
  ayuda?: ReactNode;
  /** Mensaje de error: qué pasó y cómo corregirlo. */
  error?: ReactNode;
  /** Marca visual de obligatorio; el control debe llevar `required`. */
  requerido?: boolean;
  /** Marca visual de opcional, para formularios con mayoría de obligatorios. */
  opcional?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Agrupa etiqueta, control, ayuda y error de un campo de formulario (E2/E4).
 * El control (children) debe usar el mismo `id` y
 * `aria-describedby={describirCampo(id, { ayuda, error })}` para que los
 * lectores de pantalla anuncien la ayuda y el error.
 */
export function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  requerido = false,
  opcional = false,
  className,
  children,
}: CampoProps) {
  return (
    <div className={unirClases("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {etiqueta}
        {requerido ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
        {opcional ? (
          <span className="ml-1 font-normal text-tinta-tenue">(opcional)</span>
        ) : null}
      </label>
      {children}
      {ayuda ? (
        <p id={`${id}-ayuda`} className="text-xs text-tinta-tenue">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1 text-xs font-medium text-danger"
        >
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

type PropsInvalido = {
  /** Pinta el estado de error y setea `aria-invalid`. */
  invalido?: boolean;
};

/** Input de texto del design system (min-h 44px, E5). */
export function Entrada({
  invalido = false,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & PropsInvalido) {
  return (
    <input
      {...props}
      aria-invalid={invalido || undefined}
      className={unirClases("min-h-11", clasesControl(invalido), className)}
    />
  );
}

/** Select nativo con flecha propia (accesible y usable en mobile). */
export function Selector({
  invalido = false,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & PropsInvalido) {
  return (
    <div className={unirClases("relative", className)}>
      <select
        {...props}
        aria-invalid={invalido || undefined}
        className={unirClases(
          "min-h-11 cursor-pointer appearance-none pr-9",
          clasesControl(invalido),
        )}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-tinta-tenue"
        aria-hidden="true"
      />
    </div>
  );
}

/** Área de texto multilínea (descripciones, mensajes, motivos). */
export function AreaTexto({
  invalido = false,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & PropsInvalido) {
  return (
    <textarea
      {...props}
      aria-invalid={invalido || undefined}
      className={unirClases("min-h-28 resize-y", clasesControl(invalido), className)}
    />
  );
}
