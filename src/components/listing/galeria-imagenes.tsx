"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { BotonFavorito } from "@/components/listing/boton-favorito";
import { unirClases } from "@/components/ui/unir-clases";

type GaleriaImagenesProps = {
  imagenes: Array<{ url: string; alt: string | null }>;
  titulo: string;
  // Corazón de favorito superpuesto sobre la foto (solo si hay sesión y no es
  // el dueño). Siempre visible: en mobile no hay hover.
  mostrarFavorito?: boolean;
  listingId?: string;
  inicialFavorito?: boolean;
};

const claseFlecha =
  "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-superficie/90 text-tinta shadow-card hover:bg-superficie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-0 sm:flex";

/**
 * Galería del detalle, pensada para el pulgar: en mobile las fotos se deslizan
 * con scroll-snap nativo (sin librerías) y un contador indica la posición; en
 * desktop suma flechas y miniaturas. El índice activo se deriva del scroll,
 * así deslizar, tocar una miniatura o usar las flechas quedan sincronizados.
 */
export function GaleriaImagenes({
  imagenes,
  titulo,
  mostrarFavorito,
  listingId,
  inicialFavorito,
}: GaleriaImagenesProps) {
  const [indice, setIndice] = useState(0);
  const refCarril = useRef<HTMLDivElement>(null);

  function irA(destino: number) {
    const carril = refCarril.current;
    if (!carril) {
      return;
    }
    const acotado = Math.max(0, Math.min(imagenes.length - 1, destino));
    carril.scrollTo({ left: acotado * carril.clientWidth, behavior: "smooth" });
  }

  function manejarScroll() {
    const carril = refCarril.current;
    if (!carril || carril.clientWidth === 0) {
      return;
    }
    setIndice(Math.round(carril.scrollLeft / carril.clientWidth));
  }

  const favorito =
    mostrarFavorito && listingId ? (
      <div className="absolute right-3 top-3 z-10">
        <BotonFavorito
          listingId={listingId}
          inicialFavorito={inicialFavorito ?? false}
          variant="foto"
        />
      </div>
    ) : null;

  if (imagenes.length === 0) {
    return (
      <div className="relative flex aspect-4/3 flex-col items-center justify-center gap-2 bg-brand-50 text-tinta-tenue sm:rounded-card sm:border sm:border-linea">
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="text-sm">Esta publicación no tiene fotos</span>
        {favorito}
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden bg-superficie sm:rounded-card sm:border sm:border-linea">
        {/* Carril con scroll-snap; la barra de scroll se oculta con una
            propiedad arbitraria (Tailwind no trae utilidad para
            scrollbar-width) porque el contador ya indica la posición. */}
        <div
          ref={refCarril}
          onScroll={manejarScroll}
          // Enfocable: con el foco, las flechas del teclado recorren las fotos.
          tabIndex={0}
          className="flex aspect-4/3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
          aria-roledescription="carrusel"
          aria-label={`Fotos de ${titulo}`}
        >
          {imagenes.map((imagen, indiceImagen) => (
            <div
              key={`${imagen.url}-${indiceImagen}`}
              className="relative h-full w-full shrink-0 snap-center"
              aria-roledescription="foto"
              aria-label={`${indiceImagen + 1} de ${imagenes.length}`}
            >
              <Image
                src={imagen.url}
                alt={imagen.alt ?? `${titulo} (foto ${indiceImagen + 1})`}
                fill
                priority={indiceImagen === 0}
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {imagenes.length > 1 ? (
          <>
            <span
              className="absolute bottom-3 left-3 rounded-full bg-brand-950/70 px-2.5 py-1 text-xs font-medium text-white tabular-nums"
              aria-live="polite"
            >
              {indice + 1} / {imagenes.length}
            </span>
            <button
              type="button"
              onClick={() => irA(indice - 1)}
              disabled={indice === 0}
              className={unirClases(claseFlecha, "left-3")}
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
              <span className="sr-only">Foto anterior</span>
            </button>
            <button
              type="button"
              onClick={() => irA(indice + 1)}
              disabled={indice === imagenes.length - 1}
              className={unirClases(claseFlecha, "right-3")}
            >
              <ChevronRight className="size-6" aria-hidden="true" />
              <span className="sr-only">Foto siguiente</span>
            </button>
          </>
        ) : null}
        {favorito}
      </div>

      {imagenes.length > 1 ? (
        <div className="mt-3 hidden gap-2 overflow-x-auto sm:flex">
          {imagenes.map((imagen, indiceImagen) => (
            <button
              key={`${imagen.url}-miniatura-${indiceImagen}`}
              type="button"
              onClick={() => irA(indiceImagen)}
              aria-label={`Ver foto ${indiceImagen + 1}`}
              aria-current={indiceImagen === indice ? "true" : undefined}
              className={unirClases(
                "relative size-16 shrink-0 overflow-hidden rounded-control border-2 bg-superficie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                indiceImagen === indice
                  ? "border-brand-700"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={imagen.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
