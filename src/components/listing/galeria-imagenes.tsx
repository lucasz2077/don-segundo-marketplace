"use client";

import { useState } from "react";
import Image from "next/image";

type GaleriaImagenesProps = {
  imagenes: Array<{ url: string; alt: string | null }>;
  titulo: string;
};

/**
 * Galería simple de imágenes: imagen principal grande con miniaturas para
 * cambiar la vista.
 */
export function GaleriaImagenes({ imagenes, titulo }: GaleriaImagenesProps) {
  const [indice, setIndice] = useState(0);
  const principal = imagenes[indice];

  if (!principal) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-sm text-brand-600">
        Sin imágenes
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-brand-100 bg-brand-50">
        <Image
          src={principal.url}
          alt={principal.alt ?? titulo}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 66vw"
          className="object-cover"
        />
      </div>
      {imagenes.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {imagenes.map((imagen, indiceImagen) => (
            <button
              key={indiceImagen}
              type="button"
              onClick={() => setIndice(indiceImagen)}
              aria-label={`Ver imagen ${indiceImagen + 1}`}
              className={`relative h-16 w-20 overflow-hidden rounded-md border-2 ${
                indiceImagen === indice
                  ? "border-brand-700"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={imagen.url}
                alt={imagen.alt ?? `${titulo} (imagen ${indiceImagen + 1})`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
