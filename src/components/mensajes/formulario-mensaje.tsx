"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormularioMensajeProps = {
  conversacionId: string;
};

type RespuestaMensaje = {
  error?: { message?: string };
};

/**
 * Formulario para enviar un mensaje dentro de una conversación. Al enviarlo
 * refresca la ruta para que el servidor muestre el mensaje nuevo sin perder
 * el scroll del perfil.
 */
export function FormularioMensaje({ conversacionId }: FormularioMensajeProps) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviarMensaje(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const cuerpo = mensaje.trim();
    if (!cuerpo || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/conversaciones/${conversacionId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: cuerpo }),
      });

      if (respuesta.status === 401) {
        router.push(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const datos = (await respuesta.json().catch(() => null)) as
        | RespuestaMensaje
        | null;

      if (!respuesta.ok) {
        setError(
          datos?.error?.message ?? "No se pudo enviar el mensaje. Intenta de nuevo."
        );
        return;
      }

      setMensaje("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={enviarMensaje}
      className="mt-6 rounded-lg border border-brand-100 bg-white p-4"
    >
      <label
        htmlFor={`mensaje-${conversacionId}`}
        className="block text-sm font-medium text-brand-900"
      >
        Nuevo mensaje
      </label>
      <textarea
        id={`mensaje-${conversacionId}`}
        value={mensaje}
        onChange={(evento) => setMensaje(evento.target.value)}
        rows={3}
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
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}