"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AccionesReporteProps = {
  reporteId: string;
  listingId: string;
};

type Accion = {
  llave: string;
  etiqueta: string;
  url: string;
  cuerpo: Record<string, string>;
  mensajeExito: string;
  peligrosa?: boolean;
};

type RespuestaAccion = {
  error?: { message?: string };
};

/**
 * Acciones de moderación de un informe: cambiar su estado (RESOLVED /
 * DISMISSED) y accionar sobre la publicación (pausar / rechazar). Cada botón
 * tiene su propio estado de carga y refresca la página al éxito.
 */
export function AccionesReporte({
  reporteId,
  listingId,
}: AccionesReporteProps) {
  const router = useRouter();
  const [accionEnProgreso, setAccionEnProgreso] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    tipo: "exito" | "error";
    mensaje: string;
  } | null>(null);

  const acciones: Accion[] = [
    {
      llave: "estado-resuelto",
      etiqueta: "Marcar como resuelto",
      url: `/api/reportes/${reporteId}`,
      cuerpo: { estado: "RESOLVED" },
      mensajeExito: "Reporte marcado como resuelto",
    },
    {
      llave: "estado-descartado",
      etiqueta: "Descartar reporte",
      url: `/api/reportes/${reporteId}`,
      cuerpo: { estado: "DISMISSED" },
      mensajeExito: "Reporte descartado",
    },
    {
      llave: "pausar",
      etiqueta: "Pausar publicación",
      url: `/api/admin/listings/${listingId}`,
      cuerpo: { accion: "pausar" },
      mensajeExito: "Publicación pausada",
    },
    {
      llave: "rechazar",
      etiqueta: "Rechazar publicación",
      url: `/api/admin/listings/${listingId}`,
      cuerpo: { accion: "rechazar" },
      mensajeExito: "Publicación rechazada",
      peligrosa: true,
    },
  ];

  async function ejecutarAccion(accion: Accion) {
    setAccionEnProgreso(accion.llave);
    setResultado(null);
    try {
      const respuesta = await fetch(accion.url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accion.cuerpo),
      });

      if (respuesta.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (!respuesta.ok) {
        const datos = (await respuesta.json().catch(() => null)) as
          | RespuestaAccion
          | null;
        setResultado({
          tipo: "error",
          mensaje:
            datos?.error?.message ??
            "No se pudo completar la acción. Intenta de nuevo.",
        });
        return;
      }

      setResultado({ tipo: "exito", mensaje: accion.mensajeExito });
      router.refresh();
    } catch {
      setResultado({
        tipo: "error",
        mensaje: "No se pudo completar la acción. Intenta de nuevo.",
      });
    } finally {
      setAccionEnProgreso(null);
    }
  }

  return (
    <div className="mt-4 border-t border-brand-100 pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
        Acciones de moderación
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {acciones.map((accion) => (
          <button
            key={accion.llave}
            type="button"
            onClick={() => ejecutarAccion(accion)}
            disabled={accionEnProgreso !== null}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              accion.peligrosa
                ? "border-danger/40 text-danger hover:bg-danger/10"
                : "border-brand-300 text-brand-700 hover:bg-brand-50"
            }`}
          >
            {accionEnProgreso === accion.llave
              ? "Procesando..."
              : accion.etiqueta}
          </button>
        ))}
      </div>
      {resultado ? (
        <p
          className={`mt-2 text-sm ${
            resultado.tipo === "exito" ? "text-brand-700" : "text-danger"
          }`}
        >
          {resultado.mensaje}
        </p>
      ) : null}
    </div>
  );
}