import type { ReactNode } from "react";
import { Alerta } from "./alerta";

type EstadoErrorProps = {
  titulo: string;
  descripcion?: string;
  /** Acción de recuperación (p. ej. un botón "Reintentar"). */
  accion?: ReactNode;
};

/**
 * Estado de error del design system (E3): mensaje claro con acción de
 * recuperación. Es una `Alerta` de tono peligro, anunciada a lectores de
 * pantalla con role="alert"; el texto va en tinta oscura (contraste AA).
 */
export function EstadoError({ titulo, descripcion, accion }: EstadoErrorProps) {
  return (
    <Alerta tono="peligro" titulo={titulo} accion={accion}>
      {descripcion}
    </Alerta>
  );
}
