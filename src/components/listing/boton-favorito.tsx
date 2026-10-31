"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { unirClases } from "@/components/ui/unir-clases";

type BotonFavoritoProps = {
  listingId: string;
  inicialFavorito: boolean;
  inicialCantidad?: number;
  // "boton": botón con texto ("Guardar"/"Guardado"). "foto": corazón compacto
  // superpuesto sobre la imagen (sin texto, overlay circular).
  variant?: "boton" | "foto";
};

/**
 * Botón para marcar o desmarcar una publicación como favorita. Almacena el
 * estado localmente y lo sincroniza con la API; si la sesión expiró, redirige
 * al login conservando la ruta actual para volver tras autenticarse.
 */
export function BotonFavorito({
  listingId,
  inicialFavorito,
  inicialCantidad,
  variant = "boton",
}: BotonFavoritoProps) {
  const router = useRouter();
  const [esFavorito, setEsFavorito] = useState(inicialFavorito);
  const [cantidad, setCantidad] = useState(inicialCantidad);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alternarFavorito() {
    setLoading(true);
    setError(null);

    const metodo = esFavorito ? "DELETE" : "POST";
    try {
      const respuesta = await fetch(`/api/favoritos/${listingId}`, {
        method: metodo,
      });

      if (respuesta.status === 401) {
        const destino = `/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`;
        router.push(destino);
        return;
      }

      if (respuesta.status === 404) {
        setError("La publicación ya no está disponible.");
        return;
      }

      if (!respuesta.ok) {
        setError("No se pudo actualizar el favorito. Intenta de nuevo.");
        return;
      }

      setEsFavorito((previo) => !previo);
      setCantidad((previa) =>
        previa === undefined
          ? previa
          : Math.max(0, previa + (esFavorito ? -1 : 1))
      );
    } finally {
      setLoading(false);
    }
  }

  const icono = (
    <Heart
      className={unirClases("size-5", esFavorito ? "fill-danger text-danger" : "text-brand-700")}
      aria-hidden="true"
    />
  );

  if (variant === "foto") {
    return (
      <>
        <button
          type="button"
          disabled={loading}
          onClick={alternarFavorito}
          aria-pressed={esFavorito}
          aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
          className="flex size-11 items-center justify-center rounded-full bg-superficie/95 shadow-card hover:bg-superficie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {icono}
        </button>
        {error ? (
          <span
            role="alert"
            className="absolute right-0 top-full mt-1 w-48 rounded-control bg-brand-900/90 px-2 py-1 text-xs text-white"
          >
            {error}
          </span>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={alternarFavorito}
        aria-pressed={esFavorito}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-linea-fuerte bg-superficie px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {icono}
        <span>{loading ? "Procesando..." : esFavorito ? "Guardado" : "Guardar"}</span>
      </button>
      {cantidad !== undefined && (
        <span className="text-xs text-tinta-tenue">
          {cantidad} {cantidad === 1 ? "persona lo guardó" : "personas lo guardaron"}
        </span>
      )}
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
