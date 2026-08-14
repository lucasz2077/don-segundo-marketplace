import type { ReactNode } from "react";

type EstadoVacioProps = {
  titulo: string;
  descripcion?: string;
  /** Acción útil (p. ej. un enlace "Explorar publicaciones"). */
  accion?: ReactNode;
};

/**
 * Estado vacío del design system (E3): explica qué falta y ofrece una
 * acción útil. Jerarquía E2: título como h2, descripción secundaria.
 */
export function EstadoVacio({ titulo, descripcion, accion }: EstadoVacioProps) {
  return (
    <div className="rounded-card border border-brand-100 bg-white p-10 text-center">
      <h2 className="text-xl font-semibold text-brand-900 dark:text-bone">
        {titulo}
      </h2>
      {descripcion ? (
        <p className="mt-2 text-sm text-brand-600 dark:text-brand-200">
          {descripcion}
        </p>
      ) : null}
      {accion ? <div className="mt-4 flex justify-center">{accion}</div> : null}
    </div>
  );
}