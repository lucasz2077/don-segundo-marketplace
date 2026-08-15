"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";

type BotonEliminarReseniaProps = {
  reseniaId: string;
};

/**
 * Botón de eliminación con confirmación en dos pasos (patrón de
 * boton-eliminar-publicacion). Llama a DELETE /api/ratings/[id] y refresca la
 * página al finalizar; un fallo muestra un error inline sin perder el estado
 * de la reseña.
 */
export function BotonEliminarResenia({ reseniaId }: BotonEliminarReseniaProps) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eliminar() {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/ratings/${reseniaId}`, {
        method: "DELETE",
      });
      if (!respuesta.ok) {
        setError("No se pudo eliminar la reseña. Intenta de nuevo.");
        setCargando(false);
        setConfirmando(false);
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo eliminar la reseña. Intenta de nuevo.");
      setCargando(false);
      setConfirmando(false);
    }
  }

  return (
    <div>
      {error ? (
        <p className="mb-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Boton
          variante={confirmando ? "peligro" : "texto"}
          onClick={() => {
            if (confirmando) {
              eliminar();
            } else {
              setConfirmando(true);
            }
          }}
          cargando={cargando}
        >
          {cargando
            ? "Eliminando..."
            : confirmando
              ? "¿Confirmar eliminación?"
              : "Eliminar reseña"}
        </Boton>
        {confirmando ? (
          <Boton
            variante="secundario"
            onClick={() => setConfirmando(false)}
            disabled={cargando}
          >
            Cancelar
          </Boton>
        ) : null}
      </div>
    </div>
  );
}