"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Boton } from "@/components/ui/boton";

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
        setError("No se pudo eliminar la publicación. Intentá de nuevo.");
        setCargando(false);
        setConfirmando(false);
        return;
      }
      router.push("/listados");
      router.refresh();
    } catch {
      setError("No se pudo eliminar la publicación. Intentá de nuevo.");
      setCargando(false);
      setConfirmando(false);
    }
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Boton
          variante={confirmando ? "peligro" : "secundario"}
          onClick={eliminar}
          cargando={cargando}
          className={confirmando ? undefined : "text-danger"}
        >
          {cargando ? null : <Trash2 className="size-4" aria-hidden="true" />}
          {cargando ? "Eliminando..." : confirmando ? "Sí, eliminar" : "Eliminar"}
        </Boton>
        {confirmando && !cargando ? (
          <Boton variante="fantasma" onClick={() => setConfirmando(false)}>
            Cancelar
          </Boton>
        ) : null}
      </div>
    </div>
  );
}
