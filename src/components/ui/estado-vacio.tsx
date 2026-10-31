import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type EstadoVacioProps = {
  titulo: string;
  descripcion?: string;
  /** Ícono ilustrativo de lucide (p. ej. Heart en favoritos vacíos). */
  icono?: LucideIcon;
  /** Acción útil (p. ej. un enlace "Explorar publicaciones"). */
  accion?: ReactNode;
};

/**
 * Estado vacío del design system (E3): explica qué falta y ofrece una
 * acción útil. Jerarquía E2: título como h2, descripción secundaria.
 */
export function EstadoVacio({
  titulo,
  descripcion,
  icono: Icono,
  accion,
}: EstadoVacioProps) {
  return (
    <div className="flex flex-col items-center rounded-card border border-linea bg-superficie px-6 py-12 text-center shadow-card">
      {Icono ? (
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icono className="size-7" aria-hidden="true" />
        </span>
      ) : null}
      <h2 className="text-lg font-semibold text-tinta">{titulo}</h2>
      {descripcion ? (
        <p className="mt-2 max-w-md text-sm text-tinta-tenue">{descripcion}</p>
      ) : null}
      {accion ? <div className="mt-6 flex justify-center">{accion}</div> : null}
    </div>
  );
}
