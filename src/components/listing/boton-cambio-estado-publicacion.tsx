"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BotonCambioEstadoPublicacionProps = {
  listingId: string;
  // "pausar" solo tiene efecto desde ACTIVE; "reanudar" solo desde PAUSED.
  accion: "pausar" | "reanudar";
};

type RespuestaEstado = {
  error?: { message?: string };
};

/**
 * Botón para pausar o reanudar una publicación propia desde "Mis
 * publicaciones". Llama a POST /api/listings/[id]/estado y refresca la página
 * para reflejar el nuevo estado. Maneja 401 redirigiendo al login y los
 * errores de negocio (403/404/400) de forma visible.
 */
export function BotonCambioEstadoPublicacion({
  listingId,
  accion,
}: BotonCambioEstadoPublicacionProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pausando = accion === "pausar";
  const etiqueta = pausando ? "Pausar" : "Reanudar";

  async function ejecutar() {
    if (cargando) {
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/listings/${listingId}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });

      if (respuesta.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (!respuesta.ok) {
        const datos = (await respuesta.json().catch(() => null)) as
          | RespuestaEstado
          | null;
        setError(
          datos?.error?.message ?? "No se pudo completar la acción. Intenta de nuevo."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo completar la acción. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={ejecutar}
        disabled={cargando}
        className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cargando ? (pausando ? "Pausando..." : "Reanudando...") : etiqueta}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}