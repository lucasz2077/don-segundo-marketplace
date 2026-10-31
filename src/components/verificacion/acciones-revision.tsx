"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { clasesControl } from "@/components/ui/campo";

type RespuestaApi = {
  error?: { message?: string };
};

type AccionesRevisionProps = {
  solicitudId: string;
};

const claseCampo = `min-h-11 ${clasesControl()}`;

/**
 * Acciones de revisión de una solicitud de verificación (RF-33, solo admin).
 * Aprueba con un PATCH aprobar:true; rechazar exige motivo: al elegir
 * "Rechazar" se despliega el campo de motivo (obligatorio) y se confirma con
 * aprobar:false. Maneja el error { error: { message } } de la API, redirige a
 * sign-in ante 401 y refresca la página al éxito (el detalle pasa a revisado).
 */
export function AccionesRevision({ solicitudId }: AccionesRevisionProps) {
  const router = useRouter();
  const [modoRechazo, setModoRechazo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState<"aprobar" | "rechazar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function enviar(aprobar: boolean) {
    setEnviando(aprobar ? "aprobar" : "rechazar");
    setError(null);
    setExito(null);

    let cuerpo: Record<string, unknown>;
    if (aprobar) {
      cuerpo = { aprobar: true };
    } else {
      const motivoFinal = motivo.trim();
      if (!motivoFinal) {
        setError("El motivo de rechazo es obligatorio");
        setEnviando(null);
        return;
      }
      cuerpo = { aprobar: false, motivoRechazo: motivoFinal };
    }

    try {
      const respuesta = await fetch(`/api/verificaciones/${solicitudId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (respuesta.status === 401) {
        router.push("/sign-in");
        return;
      }
      if (!respuesta.ok) {
        const datos = (await respuesta.json().catch(() => null)) as
          | RespuestaApi
          | null;
        setError(
          datos?.error?.message ??
            "No se pudo guardar la revisión. Intentá de nuevo."
        );
        return;
      }
      setExito(aprobar ? "Solicitud aprobada" : "Solicitud rechazada");
      if (!aprobar) {
        setModoRechazo(false);
        setMotivo("");
      }
      router.refresh();
    } catch {
      setError("No se pudo guardar la revisión. Intentá de nuevo.");
    } finally {
      setEnviando(null);
    }
  }

  function cancelarRechazo() {
    setModoRechazo(false);
    setMotivo("");
    setError(null);
  }

  return (
    <div className="mt-8 rounded-card border border-linea bg-superficie p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
        Acciones de revisión
      </p>
      {modoRechazo ? (
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            void enviar(false);
          }}
        >
          <div>
            <label
              htmlFor="motivo-rechazo"
              className="mb-1 block text-sm font-medium text-brand-900"
            >
              Motivo del rechazo <span className="text-danger">*</span>
            </label>
            <textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              rows={3}
              maxLength={500}
              required
              placeholder="Explicá al vendedor por qué no se aprueba la solicitud"
              className={claseCampo}
            />
            <p className="mt-1 text-xs text-brand-600">
              El vendedor recibirá este motivo junto a la notificación.
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Boton
              type="submit"
              variante="peligro"
              cargando={enviando === "rechazar"}
            >
              {enviando === "rechazar"
                ? "Rechazando..."
                : "Confirmar rechazo"}
            </Boton>
            <Boton
              type="button"
              variante="secundario"
              disabled={enviando !== null}
              onClick={cancelarRechazo}
            >
              Cancelar
            </Boton>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Boton
            type="button"
            variante="primario"
            cargando={enviando === "aprobar"}
            onClick={() => void enviar(true)}
          >
            {enviando === "aprobar" ? "Aprobando..." : "Aprobar"}
          </Boton>
          <Boton
            type="button"
            variante="peligro"
            disabled={enviando !== null}
            onClick={() => setModoRechazo(true)}
          >
            Rechazar
          </Boton>

          {error ? (
            <p
              role="alert"
              className="w-full rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
          {exito ? (
            <p className="mt-2 w-full text-sm text-brand-700">{exito}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}