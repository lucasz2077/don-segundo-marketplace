import type { ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { unirClases } from "./unir-clases";

export type TonoAlerta = "info" | "exito" | "advertencia" | "peligro";

const configPorTono: Record<
  TonoAlerta,
  { icono: LucideIcon; contenedor: string; colorIcono: string }
> = {
  info: {
    icono: Info,
    contenedor: "border-brand-200 bg-brand-50",
    colorIcono: "text-brand-600",
  },
  exito: {
    icono: CircleCheck,
    contenedor: "border-success/30 bg-success/5",
    colorIcono: "text-success",
  },
  advertencia: {
    icono: TriangleAlert,
    contenedor: "border-warning/30 bg-warning/5",
    colorIcono: "text-warning-fuerte",
  },
  peligro: {
    icono: CircleAlert,
    contenedor: "border-danger/30 bg-danger/5",
    colorIcono: "text-danger",
  },
};

type AlertaProps = {
  tono?: TonoAlerta;
  titulo?: ReactNode;
  /** Acción relacionada (p. ej. "Vincular Mercado Pago", "Reintentar"). */
  accion?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/**
 * Mensaje contextual dentro de una página (info, éxito, advertencia,
 * peligro). Los de peligro se anuncian con role="alert"; el resto con
 * role="status" para no interrumpir. El texto va siempre en tinta oscura
 * (contraste AA); el color de tono queda en borde, fondo e ícono.
 */
export function Alerta({
  tono = "info",
  titulo,
  accion,
  className,
  children,
}: AlertaProps) {
  const { icono: Icono, contenedor, colorIcono } = configPorTono[tono];

  return (
    <div
      role={tono === "peligro" ? "alert" : "status"}
      className={unirClases("flex gap-3 rounded-card border p-4", contenedor, className)}
    >
      <Icono className={unirClases("mt-0.5 size-5 shrink-0", colorIcono)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo ? <p className="text-sm font-semibold text-tinta">{titulo}</p> : null}
        {children ? (
          <div className={unirClases("text-sm text-tinta-suave", Boolean(titulo) && "mt-1")}>
            {children}
          </div>
        ) : null}
        {accion ? <div className="mt-3">{accion}</div> : null}
      </div>
    </div>
  );
}
