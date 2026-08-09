"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type BotonContactarProps = {
  listingId: string;
  sesionIniciada: boolean;
};

type RespuestaConversacion = {
  data?: {
    conversacion?: { id: string };
  };
  error?: { message?: string };
};

/**
 * Botón de contacto del detalle de publicación. Sin sesión redirige al login
 * con la ruta actual; con sesión despliega un panel con un textarea para
 * enviar la primera consulta vía plataforma. Al éxito muestra el enlace a la
 * conversación creada.
 */
export function BotonContactar({
  listingId,
  sesionIniciada,
}: BotonContactarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversacionId, setConversacionId] = useState<string | null>(null);

  if (!sesionIniciada) {
    return (
      <Link
        href={`/sign-in?redirect=${encodeURIComponent(pathname)}`}
        className="mt-4 inline-block rounded-md bg-brand-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
      >
        Contactar
      </Link>
    );
  }

  if (conversacionId) {
    return (
      <div className="mt-4 flex flex-col items-start gap-2">
        <p className="text-sm font-medium text-brand-900">
          Tu consulta fue enviada
        </p>
        <Link
          href={`/mensajes/${conversacionId}`}
          className="rounded-md bg-brand-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Ver conversación
        </Link>
      </div>
    );
  }

  async function enviarConsulta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const cuerpo = mensaje.trim();
    if (!cuerpo || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/conversaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, mensaje: cuerpo }),
      });

      if (respuesta.status === 401) {
        router.push(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const datos = (await respuesta.json().catch(() => null)) as
        | RespuestaConversacion
        | null;

      if (!respuesta.ok) {
        setError(
          datos?.error?.message ?? "No se pudo enviar tu consulta. Intenta de nuevo."
        );
        return;
      }

      setConversacionId(datos?.data?.conversacion?.id ?? null);
      setMensaje("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {!panelAbierto ? (
        <button
          type="button"
          onClick={() => setPanelAbierto(true)}
          className="rounded-md bg-brand-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Contactar
        </button>
      ) : (
        <form
          onSubmit={enviarConsulta}
          className="rounded-lg border border-brand-100 bg-brand-50 p-4"
        >
          <label
            htmlFor={`consulta-${listingId}`}
            className="block text-sm font-medium text-brand-900"
          >
            Tu consulta
          </label>
          <textarea
            id={`consulta-${listingId}`}
            value={mensaje}
            onChange={(evento) => setMensaje(evento.target.value)}
            rows={4}
            maxLength={2000}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-brand-300 bg-white p-3 text-sm text-brand-900 placeholder:text-brand-400 disabled:opacity-50"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !mensaje.trim()}
              className="rounded-md bg-brand-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar consulta"}
            </button>
            <button
              type="button"
              onClick={() => setPanelAbierto(false)}
              disabled={loading}
              className="rounded-md border border-brand-300 px-4 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
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