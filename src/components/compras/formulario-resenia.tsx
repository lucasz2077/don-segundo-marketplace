"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EstrellasEntrada } from "./estrellas-entrada";
import { Boton } from "@/components/ui/boton";
import { EstadoError } from "@/components/ui/estado-error";

const MAX_COMENTARIO = 500;

/**
 * Mapea el status de POST /api/ratings a un mensaje de usuario (E3: errores
 * 409/410/422 mapeados). Función pura para tests directos.
 */
export function mapearErrorResenia(
  status: number,
  mensajeServidor?: string | null
): string {
  if (status === 409) {
    return "Esta compra ya fue calificada.";
  }
  if (status === 410) {
    return "La ventana de calificación de 30 días ya venció.";
  }
  if (status === 422) {
    return mensajeServidor || "Los datos de la reseña no son válidos.";
  }
  return "No se pudo enviar tu reseña. Intenta de nuevo.";
}

type FormularioReseniaProps = {
  compraId: string;
  /** Se invoca al calificar con éxito (para cerrar el formulario). */
  onExito?: () => void;
};

/**
 * Formulario de reseña inline (D6, sin modal): estrellas accesibles (E4),
 * comentario opcional con contador <= 500 y estados de envío, error y éxito
 * (E3). Valida en cliente lo mínimo y delega la validación fuerte al
 * servidor (RF-28); al éxito refresca la página (router.refresh()) para que
 * la compra pase a estado "calificada".
 */
export function FormularioResenia({ compraId, onExito }: FormularioReseniaProps) {
  const router = useRouter();
  const [puntaje, setPuntaje] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) {
      return;
    }
    if (puntaje === null) {
      setError("Seleccioná una calificación de 1 a 5 estrellas.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compraId,
          puntaje,
          // El comentario vacío se omite: el servicio lo guarda como null (RF-27).
          ...(comentario.trim() !== "" ? { comentario: comentario.trim() } : {}),
        }),
      });

      if (respuesta.status === 401) {
        router.push("/sign-in");
        return;
      }

      const datos = (await respuesta.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!respuesta.ok) {
        setError(mapearErrorResenia(respuesta.status, datos?.error?.message));
        return;
      }

      setExito(true);
      router.refresh();
      onExito?.();
    } catch {
      setError("No se pudo enviar tu reseña. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div
        role="status"
        className="rounded-card border border-brand-100 bg-brand-50 p-4"
      >
        <p className="text-sm font-medium text-brand-900 dark:text-bone">
          ¡Gracias por tu reseña!
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-4 rounded-card border border-brand-100 bg-bone p-4"
    >
      <EstrellasEntrada
        valor={puntaje}
        onChange={setPuntaje}
        name={`puntaje-${compraId}`}
        label="¿Cómo calificás la venta?"
      />

      <div className="mt-4">
        <label
          htmlFor={`comentario-${compraId}`}
          className="text-sm font-medium text-brand-900 dark:text-bone"
        >
          Comentario{" "}
          <span className="font-normal text-brand-600 dark:text-brand-200">
            (opcional)
          </span>
        </label>
        <textarea
          id={`comentario-${compraId}`}
          value={comentario}
          onChange={(event) =>
            setComentario(event.target.value.slice(0, MAX_COMENTARIO))
          }
          maxLength={MAX_COMENTARIO}
          rows={3}
          placeholder="Contanos cómo fue la venta..."
          className="mt-1 w-full rounded-control border border-brand-300 bg-white px-3 py-2 text-sm text-brand-900 placeholder:text-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        />
        <p
          aria-live="polite"
          className="mt-1 text-right text-xs text-brand-600 dark:text-brand-200"
        >
          {comentario.length}/{MAX_COMENTARIO}
        </p>
      </div>

      {error ? (
        <div className="mt-4">
          <EstadoError
            titulo="No se pudo enviar tu reseña"
            descripcion={error}
            accion={
              <Boton variante="secundario" onClick={() => setError(null)}>
                Reintentar
              </Boton>
            }
          />
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Boton type="submit" cargando={enviando}>
          {enviando ? "Enviando..." : "Enviar reseña"}
        </Boton>
      </div>
    </form>
  );
}