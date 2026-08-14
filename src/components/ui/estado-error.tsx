import type { ReactNode } from "react";

type EstadoErrorProps = {
  titulo: string;
  descripcion?: string;
  /** Acción de recuperación (p. ej. un botón "Reintentar"). */
  accion?: ReactNode;
};

/**
 * Estado de error del design system (E3): mensaje claro con acción de
 * recuperación. Anunciado a lectores de pantalla con role="alert".
 * Contraste AA: texto oscuro sobre superficie clara, nunca el color del
 * fondo (src/AGENTS.md).
 */
export function EstadoError({ titulo, descripcion, accion }: EstadoErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-card border border-danger/40 bg-brand-50 p-4"
    >
      <p className="text-sm font-semibold text-brand-900 dark:text-bone">
        {titulo}
      </p>
      {descripcion ? (
        <p className="mt-1 text-sm text-brand-700 dark:text-brand-200">
          {descripcion}
        </p>
      ) : null}
      {accion ? <div className="mt-3">{accion}</div> : null}
    </div>
  );
}