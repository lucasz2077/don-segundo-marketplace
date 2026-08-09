"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BotonQuitarFavoritoProps = {
  listingId: string;
};

/**
 * Botón para quitar una publicación de la lista de favoritos. Llama al
 * endpoint DELETE y refresca la página para que la tarjeta desaparezca.
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
        setError("No se pudo quitar el favorito. Intenta de nuevo.");
        setCargando(false);
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo quitar el favorito. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <div>
      {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={quitar}
        disabled={cargando}
        className="rounded-md border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cargando ? "Quitando..." : "Quitar de favoritos"}
      </button>
    </div>
  );
}