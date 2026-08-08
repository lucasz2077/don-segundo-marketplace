"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BotonEliminarPublicacionProps = {
  listingId: string;
};

/**
 * Botón de eliminación con confirmación en dos pasos. Llama al endpoint
 * DELETE /api/listings/[id] y vuelve al listado al finalizar.
 */
export function BotonEliminarPublicacion({
  listingId,
}: BotonEliminarPublicacionProps) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eliminar() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
      });
      if (!respuesta.ok) {
        setError("No se pudo eliminar la publicación. Intenta de nuevo.");
        setCargando(false);
        setConfirmando(false);
        return;
      }
      router.push("/listados");
      router.refresh();
    } catch {
      setError("No se pudo eliminar la publicación. Intenta de nuevo.");
      setCargando(false);
      setConfirmando(false);
    }
  }

  return (
    <div>
      {error ? (
        <p className="mb-2 text-sm text-danger">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={eliminar}
        disabled={cargando}
        className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          confirmando
            ? "border-danger bg-danger text-white hover:bg-danger/90"
            : "border-danger/40 text-danger hover:bg-danger/10"
        }`}
      >
        {cargando
          ? "Eliminando..."
          : confirmando
            ? "¿Confirmar eliminación?"
            : "Eliminar"}
      </button>
    </div>
  );
}
