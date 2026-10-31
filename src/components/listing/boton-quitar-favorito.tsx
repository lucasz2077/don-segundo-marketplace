"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, LoaderCircle } from "lucide-react";

type BotonQuitarFavoritoProps = {
  listingId: string;
};

/**
 * Corazón lleno superpuesto a la tarjeta de un favorito: al tocarlo quita la
 * publicación de la lista (DELETE) y refresca la página para que la tarjeta
 * desaparezca. Target táctil de 44px.
 */
export function BotonQuitarFavorito({ listingId }: BotonQuitarFavoritoProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function quitar() {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/favoritos/${listingId}`, {
        method: "DELETE",
      });
      if (!respuesta.ok) {
        setError("No se pudo quitar el favorito. Intentá de nuevo.");
        setCargando(false);
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo quitar el favorito. Intentá de nuevo.");
      setCargando(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={quitar}
        disabled={cargando}
        aria-label="Quitar de favoritos"
        className="flex size-11 items-center justify-center rounded-full bg-superficie/95 shadow-card hover:bg-superficie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed"
      >
        {cargando ? (
          <LoaderCircle className="size-5 text-tinta-tenue motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <Heart className="size-5 fill-danger text-danger" aria-hidden="true" />
        )}
      </button>
      {error ? (
        <p
          role="alert"
          className="absolute right-0 top-full mt-1 w-44 rounded-control bg-brand-900/90 px-2 py-1 text-xs text-white"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
