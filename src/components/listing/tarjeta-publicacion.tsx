import Image from "next/image";
import Link from "next/link";
import { formatearPrecio, type Moneda } from "@/lib/formato";
import { BadgeVerificado } from "@/components/verificacion/badge-verificado";
import { EstrellasCalificacion } from "@/components/compras/estrellas-calificacion";
import type { RatingVendedor } from "@/lib/perfiles";

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
  /** Estado de verificación del dueño; el sello solo se muestra en VERIFIED (RF-38). */
  sellerVerified?: string | null;
  /**
   * Rating del vendedor ya derivado (RF-52). Con 3+ muestras muestra
   * estrellas sm (EstrellasCalificacion); null o ausente → "Sin reseñas aún"
   * (nunca un puntaje poco representativo, RF-24).
   */
  rating?: RatingVendedor;
};

/**
 * Tarjeta de publicación para listados e inicio. Muestra la primera imagen,
 * título, precio formateado, rating del vendedor (RF-52), condición y
 * provincia. Renderiza el sello de vendedor verificado junto al título cuando
 * el dueño está VERIFIED (RF-38); ni la verificación ni el rating alteran el
 * orden ni los filtros de la búsqueda.
 */
export function TarjetaPublicacion({
  publicacion,
  sellerVerified,
  rating,
}: TarjetaPublicacionProps) {
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
        <div className="flex flex-wrap items-center gap-x-2">
          <h3 className="line-clamp-2 text-sm font-medium text-brand-900 group-hover:text-brand-700">
            {publicacion.title}
          </h3>
          <BadgeVerificado sellerVerified={sellerVerified} />
        </div>
        <p className="mt-2 text-base font-semibold text-brand-900">
          {formatearPrecio(publicacion.price, publicacion.currency)}
        </p>
        {rating ? (
          <div className="mt-1">
            <EstrellasCalificacion
              promedio={rating.promedio}
              cantidad={rating.cantidad}
              tamanio="sm"
            />
          </div>
        ) : (
          <p className="mt-1 text-sm text-brand-600">Sin reseñas aún</p>
        )}
        <p className="mt-1 text-sm text-brand-600">{publicacion.province}</p>
      </div>
    </Link>
  );
}
