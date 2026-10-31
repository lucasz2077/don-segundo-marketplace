import Image from "next/image";
import { unirClases } from "./unir-clases";

type TonoLogo = "crema" | "azul";
type TamanioLogo = "sm" | "md" | "lg";

// Proporciones de los SVG de public/marca (viewBox del trazado del logo).
const PROPORCION_ISOTIPO = 1506 / 1455;
const PROPORCION_NOMBRE = 2154 / 456;

const alturasPorTamanio: Record<TamanioLogo, { isotipo: number; nombre: number }> = {
  sm: { isotipo: 32, nombre: 18 },
  md: { isotipo: 40, nombre: 22 },
  lg: { isotipo: 56, nombre: 32 },
};

type LogoProps = {
  /** crema sobre fondos azules (header), azul sobre fondos claros. */
  tono?: TonoLogo;
  tamanio?: TamanioLogo;
  /** Solo el isotipo (gaucho), para espacios reducidos. */
  soloIsotipo?: boolean;
  className?: string;
};

/**
 * Logo de Don Segundo en versión horizontal (isotipo + nombre) o solo
 * isotipo, a partir de los SVG vectorizados del logo original (public/marca).
 * El nombre accesible es siempre "Don Segundo"; el isotipo es decorativo.
 */
export function Logo({
  tono = "azul",
  tamanio = "md",
  soloIsotipo = false,
  className,
}: LogoProps) {
  const alturas = alturasPorTamanio[tamanio];

  return (
    <span
      role="img"
      aria-label="Don Segundo"
      className={unirClases("inline-flex shrink-0 items-center gap-2", className)}
    >
      <Image
        src={`/marca/isotipo-${tono}.svg`}
        alt=""
        width={Math.round(alturas.isotipo * PROPORCION_ISOTIPO)}
        height={alturas.isotipo}
        priority
      />
      {soloIsotipo ? null : (
        <Image
          src={`/marca/nombre-${tono}.svg`}
          alt=""
          width={Math.round(alturas.nombre * PROPORCION_NOMBRE)}
          height={alturas.nombre}
          priority
        />
      )}
    </span>
  );
}
