"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { EstadoError } from "@/components/ui/estado-error";

const MIN_MOTIVO = 10;
const MAX_MOTIVO = 500;

/**
 * Mapea el status/código de POST /api/compras/[id]/devolucion a un mensaje de
 * usuario (RF-49/5.4: 404/403/409×2/410/422 mapeados). Función pura para
 * tests directos.
 */
export function mapearErrorDevolucion(
  status: number,
  code?: string | null,
  mensajeServidor?: string | null
): string {
  if (status === 410) {
    return "La ventana de devolución de 7 días ya venció.";
  }
  if (status === 409) {
    if (code === "DEVO_YA_PENDIENTE") {
      return "Ya tenés una solicitud de devolución en revisión para esta compra.";
    }
    if (code === "COMPRA_NO_APROBADA") {
      return "Esta compra no está aprobada, así que no admite devolución.";
    }
    return "No se pudo solicitar la devolución en este momento.";
  }
  if (status === 422) {
    return (
      mensajeServidor ||
      "El motivo debe tener al menos 10 caracteres y menos de 500."
    );
  }
  if (status === 404) {
    return "La compra no existe o ya no está disponible.";
  }
  if (status === 403) {
    return "No podés solicitar la devolución de esta compra.";
  }
  return "No se pudo solicitar la devolución. Intenta de nuevo.";
}

type FormularioDevolucionProps = {
  compraId: string;
  /** Se invoca al enviar con éxito (para cerrar el formulario). */
  onExito?: () => void;
};

/**
 * Formulario inline de solicitud de devolución (RF-49/5.4, mismo patrón que
 * FormularioResenia): motivo obligatorio de 10..500 caracteres con contador,
 * estados de envío, error y éxito (E3). Valida en cliente lo mínimo y delega
 * la validación fuerte al servidor; al éxito refresca la página
 * (router.refresh()) para que la tarjeta pase a estado "solicitud en
 * revisión".
 */
export function FormularioDevolucion({
  compraId,
  onExito,
}: FormularioDevolucionProps) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) {
      return;
    }
    if (motivo.trim().length < MIN_MOTIVO) {
      setError("Contanos el motivo con al menos 10 caracteres.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/compras/${compraId}/devolucion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });

      if (respuesta.status === 401) {
        router.push("/sign-in");
        return;
      }

      const datos = (await respuesta.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;

      if (!respuesta.ok) {
        setError(
          mapearErrorDevolucion(
            respuesta.status,
            datos?.error?.code,
            datos?.error?.message
          )
        );
        return;
      }

      setExito(true);
      router.refresh();
      onExito?.();
    } catch {
      setError("No se pudo solicitar la devolución. Intenta de nuevo.");
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
          Solicitud de devolución enviada. El vendedor la va a revisar.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-4 rounded-card border border-brand-100 bg-bone p-4"
    >
      <label
        htmlFor={`motivo-devolucion-${compraId}`}
        className="text-sm font-medium text-brand-900 dark:text-bone"
      >
        Motivo de la devolución
      </label>
      <textarea
        id={`motivo-devolucion-${compraId}`}
        value={motivo}
        onChange={(event) =>
          setMotivo(event.target.value.slice(0, MAX_MOTIVO))
        }
        maxLength={MAX_MOTIVO}
        rows={3}
        placeholder="Contanos qué pasó con la compra..."
        className="mt-1 w-full rounded-control border border-brand-300 bg-white px-3 py-2 text-sm text-brand-900 placeholder:text-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      />
      <p
        aria-live="polite"
        className="mt-1 text-right text-xs text-brand-600 dark:text-brand-200"
      >
        {motivo.length}/{MAX_MOTIVO}
      </p>

      {error ? (
        <div className="mt-4">
          <EstadoError
            titulo="No se pudo enviar la solicitud"
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
          {enviando ? "Enviando..." : "Enviar solicitud"}
        </Boton>
      </div>
    </form>
  );
}