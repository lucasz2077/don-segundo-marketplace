"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  if (variant === "foto") {
    return (
      <>
        <button
          type="button"
          disabled={loading}
          onClick={alternarFavorito}
          aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-100 bg-white/95 text-lg shadow-md transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden className={esFavorito ? "text-danger" : "text-brand-700"}>
            {esFavorito ? "♥" : "♡"}
          </span>
        </button>
        {error ? (
          <span className="absolute -bottom-1 right-0 rounded bg-brand-900/80 px-1.5 py-0.5 text-[10px] text-white">
            {error}
          </span>
        ) : null}
      </>
    );
  }

  const clasesBase =
    "inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const clases = esFavorito
    ? `${clasesBase} border-brand-700 bg-brand-700 text-white hover:bg-brand-600`
    : `${clasesBase} border-brand-300 bg-white text-brand-700 hover:bg-brand-50`;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={alternarFavorito}
        className={clases}
      >
        <span aria-hidden>{esFavorito ? "♥" : "♡"}</span>
        <span>{loading ? "Procesando..." : esFavorito ? "Guardado" : "Guardar"}</span>
      </button>
      {cantidad !== undefined && (
        <span className="text-xs text-brand-600">
          {cantidad} {cantidad === 1 ? "persona lo guardó" : "personas lo guardaron"}
        </span>
      )}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}