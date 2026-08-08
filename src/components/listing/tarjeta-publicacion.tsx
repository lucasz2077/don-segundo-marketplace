import Image from "next/image";
import Link from "next/link";
import { formatearPrecio, type Moneda } from "@/lib/formato";

type TarjetaPublicacionProps = {
  publicacion: {
    id: string;
    title: string;
    price: { toString(): string };
    currency: Moneda;
    condition: "NEW" | "USED";
    province: string;
    images: Array<{ url: string; alt: string | null }>;
  };
};

/**
 * Tarjeta de publicación para listados e inicio. Muestra la primera imagen,
 * título, precio formateado, condición y provincia.
 */
export function TarjetaPublicacion({ publicacion }: TarjetaPublicacionProps) {
  const imagenPrincipal = publicacion.images[0];
  const etiquetaCondicion =
    publicacion.condition === "NEW" ? "Nuevo" : "Usado";

  return (
    <Link
      href={`/listados/${publicacion.id}`}
      className="group overflow-hidden rounded-lg border border-brand-100 bg-white transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <div className="relative aspect-[4/3] bg-brand-50">
        {imagenPrincipal ? (
          <Image
            src={imagenPrincipal.url}
            alt={imagenPrincipal.alt ?? publicacion.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-brand-600">
            Sin imagen
          </div>
        )}
        <span className="absolute right-2 top-2 rounded bg-brand-900/80 px-2 py-0.5 text-xs font-medium text-white">
          {etiquetaCondicion}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-medium text-brand-900 group-hover:text-brand-700">
          {publicacion.title}
        </h3>
        <p className="mt-2 text-base font-semibold text-brand-900">
          {formatearPrecio(publicacion.price, publicacion.currency)}
        </p>
        <p className="mt-1 text-sm text-brand-600">{publicacion.province}</p>
      </div>
    </Link>
  );
}
