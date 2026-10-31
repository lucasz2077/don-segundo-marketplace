"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { etiquetasMotivoReporte } from "@/lib/etiquetas-reportes";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Selector } from "@/components/ui/campo";

const claseEnlaceDiscreto =
  "inline-flex min-h-10 items-center gap-1.5 text-sm text-tinta-tenue underline-offset-2 hover:text-tinta hover:underline";

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
      <Link href={`/sign-in?redirect=${encodeURIComponent(pathname)}`} className={claseEnlaceDiscreto}>
        <Flag className="size-4" aria-hidden="true" />
        Reportar publicación
      </Link>
    );
  }

  if (enviado) {
    return (
      <p role="status" className="text-sm text-tinta-tenue">
        Gracias, tu reporte fue enviado. Lo vamos a revisar.
      </p>
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
            datos?.error?.message ?? "No se pudo enviar el reporte. Intentá de nuevo."
          );
        } else {
          setError("No se pudo enviar el reporte. Intentá de nuevo.");
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
        <button type="button" onClick={() => setPanelAbierto(true)} className={claseEnlaceDiscreto}>
          <Flag className="size-4" aria-hidden="true" />
          Reportar publicación
        </button>
      ) : (
        <form
          onSubmit={enviarReporte}
          className="flex flex-col gap-3 rounded-card border border-linea bg-superficie-alt p-4"
        >
          <Campo id={`motivo-${listingId}`} etiqueta="Motivo del reporte" requerido>
            <Selector
              id={`motivo-${listingId}`}
              value={razon}
              onChange={(evento) => setRazon(evento.target.value)}
              disabled={cargando}
              required
            >
              <option value="">Elegí un motivo</option>
              {Object.entries(etiquetasMotivoReporte).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo id={`detalles-${listingId}`} etiqueta="Detalles" opcional>
            <AreaTexto
              id={`detalles-${listingId}`}
              value={detalles}
              onChange={(evento) => setDetalles(evento.target.value)}
              rows={3}
              maxLength={2000}
              disabled={cargando}
              placeholder="Contanos qué viste y por qué lo reportás"
            />
          </Campo>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Boton type="submit" cargando={cargando} disabled={!razon}>
              {cargando ? "Enviando..." : "Enviar reporte"}
            </Boton>
            <Boton variante="fantasma" onClick={() => setPanelAbierto(false)} disabled={cargando}>
              Cancelar
            </Boton>
          </div>
        </form>
      )}
    </div>
  );
}
