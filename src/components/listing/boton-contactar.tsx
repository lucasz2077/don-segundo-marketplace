"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { AreaTexto, Campo, describirCampo } from "@/components/ui/campo";

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
      <BotonEnlace
        href={`/sign-in?redirect=${encodeURIComponent(pathname)}`}
        variante="secundario"
        tamanio="lg"
        anchoCompleto
      >
        <MessageCircle className="size-5" aria-hidden="true" />
        Preguntar al vendedor
      </BotonEnlace>
    );
  }

  if (conversacionId) {
    return (
      <Alerta
        tono="exito"
        titulo="Tu consulta fue enviada"
        accion={
          <BotonEnlace href={`/mensajes/${conversacionId}`} variante="secundario" tamanio="sm">
            Ver conversación
          </BotonEnlace>
        }
      >
        Te avisamos cuando el vendedor responda.
      </Alerta>
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
          datos?.error?.message ?? "No se pudo enviar tu consulta. Intentá de nuevo."
        );
        return;
      }

      setConversacionId(datos?.data?.conversacion?.id ?? null);
      setMensaje("");
    } finally {
      setLoading(false);
    }
  }

  const idConsulta = `consulta-${listingId}`;

  return (
    <div className="w-full">
      {!panelAbierto ? (
        <Boton
          variante="secundario"
          tamanio="lg"
          anchoCompleto
          onClick={() => setPanelAbierto(true)}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Preguntar al vendedor
        </Boton>
      ) : (
        <form
          onSubmit={enviarConsulta}
          className="rounded-card border border-linea bg-superficie-alt p-4"
        >
          <Campo
            id={idConsulta}
            etiqueta="Tu consulta"
            ayuda="Preguntá por estado, entrega o formas de retiro."
            error={error ?? undefined}
          >
            <AreaTexto
              id={idConsulta}
              // El panel se abre a pedido del usuario: el foco va al campo.
              autoFocus
              value={mensaje}
              onChange={(evento) => setMensaje(evento.target.value)}
              rows={4}
              maxLength={2000}
              disabled={loading}
              invalido={Boolean(error)}
              aria-describedby={describirCampo(idConsulta, { ayuda: true, error })}
              placeholder="Hola, ¿sigue disponible?"
            />
          </Campo>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Boton type="submit" cargando={loading} disabled={!mensaje.trim()}>
              {loading ? "Enviando..." : "Enviar consulta"}
            </Boton>
            <Boton
              variante="fantasma"
              onClick={() => setPanelAbierto(false)}
              disabled={loading}
            >
              Cancelar
            </Boton>
          </div>
        </form>
      )}
    </div>
  );
}
