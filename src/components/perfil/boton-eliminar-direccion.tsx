"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BotonEliminarDireccionProps = {
  direccionId: string;
};

/**
 * Botón de eliminación de dirección con confirmación en dos pasos. Llama a
 * DELETE /api/direcciones/[id] y refresca la lista al finalizar.
 */
export function BotonEliminarDireccion({
  direccionId,
}: BotonEliminarDireccionProps) {
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
      const respuesta = await fetch(`/api/direcciones/${direccionId}`, {
        method: "DELETE",
      });
      if (!respuesta.ok) {
        setError("No se pudo eliminar la dirección. Intenta de nuevo.");
        setCargando(false);
        setConfirmando(false);
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
      setCargando(false);
      setConfirmando(false);
    }
  }

  return (
    <div>
      {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={eliminar}
        disabled={cargando}
        className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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