import type { ComponentProps } from "react";
import Link from "next/link";
import { clasesBoton, type TamanioBoton, type VarianteBoton } from "./boton";
import { unirClases } from "./unir-clases";

type BotonEnlaceProps = ComponentProps<typeof Link> & {
  variante?: VarianteBoton;
  tamanio?: TamanioBoton;
  anchoCompleto?: boolean;
};

/**
 * Enlace de navegación con forma de botón (p. ej. "Publicar", "Explorar").
 * Usa `next/link` y las mismas clases que `Boton`: si la acción navega, es un
 * enlace; si ejecuta algo en la página, es un `Boton`.
 */
export function BotonEnlace({
  variante = "primario",
  tamanio = "md",
  anchoCompleto = false,
  className,
  ...props
}: BotonEnlaceProps) {
  return (
    <Link
      {...props}
      className={unirClases(
        clasesBoton({ variante, tamanio, anchoCompleto }),
        className,
      )}
    />
  );
}
