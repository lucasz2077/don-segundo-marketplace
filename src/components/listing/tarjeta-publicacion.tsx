import Image from "next/image";
import Link from "next/link";
import { ImageOff, MapPin } from "lucide-react";
import type { Moneda } from "@/lib/formato";
import type { RatingVendedor } from "@/lib/perfiles";
import { EstrellasCalificacion } from "@/components/compras/estrellas-calificacion";
import { Precio } from "@/components/ui/precio";
import { unirClases } from "@/components/ui/unir-clases";
import { BadgeVerificado } from "@/components/verificacion/badge-verificado";

type TarjetaPublicacionProps = {
  publicacion: {
    id: string;
    title: string;
    price: { toString(): string };
    currency: Moneda;
    condition: "NEW" | "USED";
    province: string;
    city?: string | null;
    stock?: number;
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
  /**
   * "grilla": siempre vertical (inicio, carruseles). "adaptable": horizontal
   * en mobile (foto a la izquierda, más resultados por pantalla) y vertical
   * desde sm (resultados de búsqueda).
   */
  disposicion?: "grilla" | "adaptable";
  /** Carga prioritaria de la foto (primeras tarjetas visibles, LCP). */
  prioridad?: boolean;
};

/**
 * Tarjeta de publicación para listados, inicio, favoritos y perfil del
 * vendedor. Jerarquía de marketplace: foto, título, precio protagonista,
 * ubicación y confianza (sello verificado RF-38 y reputación RF-52). Toda la
 * tarjeta es clickeable a través del enlace del título (un solo enlace
 * accesible). Ni la verificación ni el rating alteran el orden de búsqueda.
 */
export function TarjetaPublicacion({
  publicacion,
  sellerVerified,
  rating,
  disposicion = "grilla",
  prioridad = false,
}: TarjetaPublicacionProps) {
  const imagenPrincipal = publicacion.images[0];
  const adaptable = disposicion === "adaptable";
  const ubicacion = publicacion.city
    ? `${publicacion.city}, ${publicacion.province}`
    : publicacion.province;

  return (
    <article
      className={unirClases(
        "group relative flex overflow-hidden rounded-card border border-linea bg-superficie shadow-card motion-safe:transition-shadow hover:shadow-card-hover",
        adaptable ? "flex-row sm:flex-col" : "flex-col",
      )}
    >
      <div
        className={unirClases(
          "relative shrink-0 bg-brand-50",
          adaptable ? "min-h-36 w-36 self-stretch sm:aspect-4/3 sm:min-h-0 sm:w-full" : "aspect-4/3 w-full",
        )}
      >
        {imagenPrincipal ? (
          <Image
            src={imagenPrincipal.url}
            alt={imagenPrincipal.alt ?? publicacion.title}
            fill
            priority={prioridad}
            sizes={
              adaptable
                ? "(max-width: 640px) 144px, (max-width: 1024px) 50vw, 25vw"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            }
            className="object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full min-h-28 flex-col items-center justify-center gap-1 text-tinta-tenue">
            <ImageOff className="size-6" aria-hidden="true" />
            <span className="text-xs">Sin foto</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="text-xs text-tinta-tenue">
          {publicacion.condition === "NEW" ? "Nuevo" : "Usado"}
          {publicacion.stock === 1 ? " · Última unidad" : null}
        </p>
        <h3 className="line-clamp-2 text-sm leading-snug text-tinta">
          <Link
            href={`/listados/${publicacion.id}`}
            className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-500"
          >
            {publicacion.title}
          </Link>
        </h3>
        <Precio
          precio={publicacion.price}
          moneda={publicacion.currency}
          tamanio="md"
          className="mt-0.5"
        />
        <p className="flex min-w-0 items-center gap-1 text-xs text-tinta-tenue">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{ubicacion}</span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-1">
          <BadgeVerificado sellerVerified={sellerVerified} />
          {rating ? (
            <EstrellasCalificacion
              promedio={rating.promedio}
              cantidad={rating.cantidad}
              compacta
            />
          ) : (
            <p className="text-xs text-tinta-tenue">Sin reseñas aún</p>
          )}
        </div>
      </div>
    </article>
  );
}
