"use client";

import { useRef } from "react";

type EstrellasEntradaProps = {
  /** Puntaje seleccionado (1-5) o null si aún no eligió. */
  valor: number | null;
  onChange: (puntaje: number) => void;
  /** name del grupo de radios (debe ser único por formulario). */
  name: string;
  /** Legend visible del grupo (E4: labels visibles). */
  label: string;
};

const PUNTAJES = [1, 2, 3, 4, 5] as const;

const RUTA_ESTRELLA =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

/**
 * Entrada de calificación como radio group NATIVO (E4): fieldset/legend con
 * cinco radios "1 estrella".."5 estrellas", navegación completa por teclado
 * (flechas) y foco visible. El radio queda sr-only; la estrella visual del
 * label refleja el estado checked (peer) y el foco con anillo.
 */
export function EstrellasEntrada({
  valor,
  onChange,
  name,
  label,
}: EstrellasEntradaProps) {
  const grupoRef = useRef<HTMLFieldSetElement>(null);

  function manejarTeclado(event: React.KeyboardEvent<HTMLFieldSetElement>) {
    const actual = valor ?? 0;
    let siguiente: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      siguiente = Math.min(actual + 1, 5);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      siguiente = Math.max(actual - 1, 1);
    }
    if (siguiente !== null) {
      event.preventDefault();
      onChange(siguiente);
      grupoRef.current
        ?.querySelector<HTMLInputElement>(
          `input[name="${name}"][value="${siguiente}"]`
        )
        ?.focus();
    }
  }

  return (
    <fieldset ref={grupoRef} onKeyDown={manejarTeclado}>
      <legend className="text-sm font-medium text-brand-900 dark:text-bone">
        {label}
      </legend>
      <div className="mt-2 flex items-center gap-1">
        {PUNTAJES.map((puntaje) => {
          const rellena = puntaje <= (valor ?? 0);
          const etiqueta =
            puntaje === 1 ? "1 estrella" : `${puntaje} estrellas`;
          return (
            <label
              key={puntaje}
              className="flex cursor-pointer items-center rounded-full p-1 focus-within:outline-none peer-focus-visible:ring-2"
            >
              <input
                type="radio"
                name={name}
                value={puntaje}
                checked={valor === puntaje}
                onChange={() => onChange(puntaje)}
                className="peer sr-only"
              />
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`h-9 w-9 p-1 transition-colors peer-checked:fill-accent-500 peer-checked:drop-shadow-sm motion-safe:transition-colors ${
                  rellena ? "fill-accent-500" : "fill-brand-200"
                } peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 rounded-full`}
              >
                <path d={RUTA_ESTRELLA} />
              </svg>
              <span className="sr-only">{etiqueta}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}