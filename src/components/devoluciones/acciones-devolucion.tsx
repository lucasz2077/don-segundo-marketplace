"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";

type RespuestaApi = {
  error?: { message?: string };
  data?: { advertencia?: string };
};

/**
 * Mapea el status de POST /api/devoluciones/[id] a un mensaje de usuario
 * (5.4: 404/403/409/502 mapeados). Función pura para tests directos.
 */
export function mapearErrorResolucion(
  status: number,
  mensajeServidor?: string | null
): string {
  if (status === 409) {
    return "Esta solicitud de devolución ya fue resuelta.";
  }
  if (status === 502) {
    return "El reembolso no pudo procesarse en Mercado Pago. Intenta de nuevo.";
  }
  if (status === 404) {
    return "La solicitud de devolución no existe.";
  }
  if (status === 403) {
    return "No podés resolver esta solicitud de devolución.";
  }
  return mensajeServidor || "No se pudo resolver la devolución. Intenta de nuevo.";
}

type AccionesDevolucionProps = {
  solicitudId: string;
};

const claseCampo =
  "w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

/**
 * Acciones de la bandeja de devoluciones del vendedor (RF-49..RF-51, 5.4):
 * aprobar la solicitud (dispara el reembolso completo, RF-51) o rechazarla
 * con motivo obligatorio al vuelo (mismo patrón que AccionesRevision). Si el
 * route responde 200 con advertencia (el refund falló tras resolver la
 * solicitud, decisión 5.2), la advertencia se exhibe junto al éxito.
 */
export function AccionesDevolucion({ solicitudId }: AccionesDevolucionProps) {
  const router = useRouter();
  const [modoRechazo, setModoRechazo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState<"aprobar" | "rechazar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [advertencia, setAdvertencia] = useState<string | null>(null);

  async function enviar(accion: "aprobar" | "rechazar") {
    setEnviando(accion);
    setError(null);
    setExito(null);
    setAdvertencia(null);

    const cuerpo: Record<string, unknown> = { accion };
    if (accion === "rechazar") {
      const motivoFinal = motivo.trim();
      if (!motivoFinal) {
        setError("El motivo de rechazo es obligatorio");
        setEnviando(null);
        return;
      }
      cuerpo.motivoRechazo = motivoFinal;
    }

    try {
      const respuesta = await fetch(`/api/devoluciones/${solicitudId}`, {
        method: "POST",
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
          mapearErrorResolucion(respuesta.status, datos?.error?.message)
        );
        return;
      }

      const datos = (await respuesta.json().catch(() => null)) as
        | RespuestaApi
        | null;
      setExito(
        accion === "aprobar"
          ? "Solicitud aprobada y reembolsada"
          : "Solicitud rechazada"
      );
      if (accion === "aprobar" && datos?.data?.advertencia) {
        setAdvertencia(datos.data.advertencia);
      }
      if (accion === "rechazar") {
        setModoRechazo(false);
        setMotivo("");
      }
      router.refresh();
    } catch {
      setError("No se pudo resolver la devolución. Intenta de nuevo.");
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
    <div className="mt-3">
      {modoRechazo ? (
        <form
          className="flex flex-col gap-3 rounded-lg border border-brand-100 bg-white p-3 shadow-sm"
          onSubmit={(evento) => {
            evento.preventDefault();
            void enviar("rechazar");
          }}
        >
          <div>
            <label
              htmlFor={`motivo-rechazo-${solicitudId}`}
              className="mb-1 block text-sm font-medium text-brand-900"
            >
              Motivo del rechazo <span className="text-danger">*</span>
            </label>
            <textarea
              id={`motivo-rechazo-${solicitudId}`}
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              rows={3}
              maxLength={500}
              required
              placeholder="Explicá al comprador por qué no se aprueba la devolución"
              className={claseCampo}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
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
              {enviando === "rechazar" ? "Rechazando..." : "Confirmar rechazo"}
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
        <div className="flex flex-wrap items-center gap-2">
          <Boton
            type="button"
            variante="primario"
            cargando={enviando === "aprobar"}
            onClick={() => void enviar("aprobar")}
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
              className="w-full rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
          {advertencia ? (
            <p
              role="status"
              className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {advertencia}
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