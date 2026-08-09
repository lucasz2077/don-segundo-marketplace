"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { etiquetasMotivoReporte } from "@/lib/etiquetas-reportes";

type BotonReportarProps = {
  listingId: string;
  sesionIniciada: boolean;
};

type RespuestaReporte = {
  error?: { message?: string };
};

/**
 * Botón discreto "Reportar" del detalle de publicación. Sin sesión redirige
 * al login con la ruta actual; con sesión despliega un panel con el motivo y
 * detalles opcionales. Al enviar muestra un mensaje de agradecimiento y
 * maneja los errores 401/403/404/400 de forma visible.
 */
export function BotonReportar({
  listingId,
  sesionIniciada,
}: BotonReportarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [razon, setRazon] = useState("");
  const [detalles, setDetalles] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  if (!sesionIniciada) {
    return (
      <Link
        href={`/sign-in?redirect=${encodeURIComponent(pathname)}`}
        className="text-sm font-medium text-brand-700 underline transition-colors hover:text-brand-900"
      >
        Reportar
      </Link>
    );
  }

  if (enviado) {
    return (
      <p className="text-sm text-brand-600">Gracias, tu reporte fue enviado</p>
    );
  }

  async function enviarReporte(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!razon || cargando) {
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, razon, detalles }),
      });

      if (respuesta.status === 401) {
        router.push(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      if (!respuesta.ok) {
        const datos = (await respuesta.json().catch(() => null)) as
          | RespuestaReporte
          | null;
        if (respuesta.status === 403 || respuesta.status === 404 || respuesta.status === 400) {
          setError(
            datos?.error?.message ?? "No se pudo enviar el reporte. Intenta de nuevo."
          );
        } else {
          setError("No se pudo enviar el reporte. Intenta de nuevo.");
        }
        return;
      }

      setEnviado(true);
      setPanelAbierto(false);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      {!panelAbierto ? (
        <button
          type="button"
          onClick={() => setPanelAbierto(true)}
          className="text-sm font-medium text-brand-700 underline transition-colors hover:text-brand-900"
        >
          Reportar
        </button>
      ) : (
        <form
          onSubmit={enviarReporte}
          className="rounded-lg border border-brand-100 bg-brand-50 p-4"
        >
          <label
            htmlFor={`motivo-${listingId}`}
            className="block text-sm font-medium text-brand-900"
          >
            Motivo del reporte
          </label>
          <select
            id={`motivo-${listingId}`}
            value={razon}
            onChange={(evento) => setRazon(evento.target.value)}
            disabled={cargando}
            className="mt-2 w-full rounded-md border border-brand-300 bg-white p-2.5 text-sm text-brand-900 disabled:opacity-50"
          >
            <option value="">Selecciona un motivo</option>
            {Object.entries(etiquetasMotivoReporte).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>

          <label
            htmlFor={`detalles-${listingId}`}
            className="mt-3 block text-sm font-medium text-brand-900"
          >
            Detalles (opcional)
          </label>
          <textarea
            id={`detalles-${listingId}`}
            value={detalles}
            onChange={(evento) => setDetalles(evento.target.value)}
            rows={3}
            maxLength={2000}
            disabled={cargando}
            placeholder="Contanos qué viste y por qué lo reportás"
            className="mt-2 w-full rounded-md border border-brand-300 bg-white p-3 text-sm text-brand-900 placeholder:text-brand-400 disabled:opacity-50"
          />

          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={cargando || !razon}
              className="rounded-md bg-brand-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? "Enviando..." : "Enviar reporte"}
            </button>
            <button
              type="button"
              onClick={() => setPanelAbierto(false)}
              disabled={cargando}
              className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              Cancelar
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </form>
      )}
    </div>
  );
}