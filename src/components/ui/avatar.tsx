import Image from "next/image";
import { unirClases } from "./unir-clases";

type TamanioAvatar = "sm" | "md" | "lg";

const estilosPorTamanio: Record<TamanioAvatar, { clase: string; px: number }> = {
  sm: { clase: "size-8 text-xs", px: 32 },
  md: { clase: "size-10 text-sm", px: 40 },
  lg: { clase: "size-16 text-xl", px: 64 },
};

/** Hasta dos iniciales del nombre ("Juan Pérez" → "JP"); "?" si está vacío. */
export function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  const iniciales = palabras
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toLocaleUpperCase("es-AR"))
    .join("");
  return iniciales || "?";
}

type AvatarProps = {
  nombre: string;
  /** Foto del usuario; sin foto se muestran sus iniciales. */
  imagen?: string | null;
  tamanio?: TamanioAvatar;
  className?: string;
};

/**
 * Avatar circular de usuario o vendedor. Es decorativo: el nombre siempre se
 * muestra como texto al lado, así que la imagen lleva alt vacío y las
 * iniciales quedan ocultas a lectores de pantalla.
 */
export function Avatar({ nombre, imagen, tamanio = "md", className }: AvatarProps) {
  const { clase, px } = estilosPorTamanio[tamanio];

  return (
    <span
      aria-hidden="true"
      className={unirClases(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-800 ring-1 ring-linea",
        clase,
        className,
      )}
    >
      {imagen ? (
        <Image src={imagen} alt="" width={px} height={px} className="size-full object-cover" />
      ) : (
        inicialesDe(nombre)
      )}
    </span>
  );
}
