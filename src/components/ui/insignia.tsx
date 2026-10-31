import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { unirClases } from "./unir-clases";

export type TonoInsignia =
  | "neutro"
  | "marca"
  | "acento"
  | "exito"
  | "advertencia"
  | "peligro"
  | "inactivo";

const estilosPorTono: Record<TonoInsignia, string> = {
  neutro: "bg-brand-50 text-brand-700 ring-brand-100",
  marca: "bg-brand-800 text-white ring-brand-800",
  acento: "bg-accent-300/40 text-accent-700 ring-accent-300",
  exito: "bg-success/10 text-success ring-success/20",
  advertencia: "bg-warning/10 text-warning-fuerte ring-warning/25",
  peligro: "bg-danger/10 text-danger ring-danger/20",
  inactivo: "bg-sand-100 text-sand-700 ring-sand-200",
};

type InsigniaProps = {
  tono?: TonoInsignia;
  /** Ícono decorativo de lucide a la izquierda del texto. */
  icono?: LucideIcon;
  className?: string;
  children: ReactNode;
};

/**
 * Etiqueta compacta de estado o atributo (condición, estado de pago, estado
 * de publicación, verificación). El significado siempre viaja en el texto;
 * el color y el ícono lo refuerzan (contraste AA en todos los tonos).
 */
export function Insignia({
  tono = "neutro",
  icono: Icono,
  className,
  children,
}: InsigniaProps) {
  return (
    <span
      className={unirClases(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        estilosPorTono[tono],
        className,
      )}
    >
      {Icono ? <Icono className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
