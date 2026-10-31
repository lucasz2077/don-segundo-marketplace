"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Send } from "lucide-react";
import { clasesControl } from "@/components/ui/campo";
import { unirClases } from "@/components/ui/unir-clases";

const INTERVALO_POLLING_MS = 4000;
const MARGEN_AUTOSCROLL_PX = 80;
const PREFIJO_ID_TEMPORAL = "temp-";

type MensajeInicial = {
  id: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type MensajeChat = MensajeInicial & {
  /** true mientras el envío optimista no fue confirmado por el servidor. */
  enviando?: boolean;
};

type ChatConversacionProps = {
  conversacionId: string;
  usuarioId: string;
  mensajesIniciales: MensajeInicial[];
};

type RespuestaPolling = {
  data?: {
    mensajes?: MensajeInicial[];
    leidosAhora?: string[];
  };
};

type RespuestaEnvio = {
  data?: MensajeInicial;
  error?: { message?: string };
};

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Fusiona los mensajes nuevos con el historial actual sin duplicar: si un id
 * ya existe (por ejemplo el mensaje real que confirmó el POST y que además
 * llegó por polling) se reemplaza en el lugar, de lo contrario se agrega al
 * final y se ordena por createdAt.
 */
function integrarMensajes(
  actuales: MensajeChat[],
  nuevos: MensajeInicial[]
): MensajeChat[] {
  if (nuevos.length === 0) {
    return actuales;
  }

  const resultado = [...actuales];
  const porId = new Map(actuales.map((mensaje) => [mensaje.id, mensaje]));

  for (const mensaje of nuevos) {
    if (porId.has(mensaje.id)) {
      const indice = resultado.findIndex((actual) => actual.id === mensaje.id);
      if (indice !== -1) {
        resultado[indice] = { ...mensaje, enviando: false };
      }
    } else {
      resultado.push({ ...mensaje });
      porId.set(mensaje.id, mensaje);
    }
  }

  return resultado.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Chat de una conversación con polling incremental (Slice 2): consulta
 * mensajes nuevos cada 4 s solo mientras la página está visible, envía de
 * forma optimista con dedupe, muestra la tilde de leído en los mensajes
 * propios, auto-scrollea al fondo si el usuario está cerca del borde y ofrece
 * un badge con los mensajes nuevos sin ver cuando está leyendo arriba.
 */
export function ChatConversacion({
  conversacionId,
  usuarioId,
  mensajesIniciales,
}: ChatConversacionProps) {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<MensajeChat[]>(() =>
    [...mensajesIniciales].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  );
  const [idsLeidos, setIdsLeidos] = useState<Set<string>>(() => new Set());
  const [mensajesNuevos, setMensajesNuevos] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<string | null>(mensajesIniciales.at(-1)?.createdAt ?? null);
  const enVueloRef = useRef(false);
  const autoscrollRef = useRef(true);
  const mensajesRef = useRef(mensajes);

  // Refleja el último estado para poder deduplicar dentro del polling sin
  // re-crear el intervalo.
  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  // Mantiene el cursor de polling en el createdAt del último mensaje conocido.
  useEffect(() => {
    if (mensajes.length > 0) {
      cursorRef.current = mensajes[mensajes.length - 1].createdAt;
    }
  }, [mensajes]);

  function estaCercaDelFondo(): boolean {
    const contenedor = contenedorRef.current;
    if (!contenedor) {
      return true;
    }
    return (
      contenedor.scrollHeight - contenedor.scrollTop - contenedor.clientHeight <
      MARGEN_AUTOSCROLL_PX
    );
  }

  function scrollAlFondo(suave: boolean) {
    const contenedor = contenedorRef.current;
    if (!contenedor) {
      return;
    }
    contenedor.scrollTo({
      top: contenedor.scrollHeight,
      behavior: suave ? "smooth" : "auto",
    });
  }

  const marcarLeidoEnServidor = useCallback(() => {
    // Fire-and-forget: marca como leídos los mensajes de la otra parte para
    // que el emisor vea la tilde y el contador global se sincronice.
    void fetch(`/api/conversaciones/${conversacionId}`, { method: "PATCH" }).catch(
      () => {
        // Silencioso: el marcado se reintenta con el próximo mensaje.
      }
    );
  }, [conversacionId]);

  const consultarNuevos = useCallback(async () => {
    if (enVueloRef.current || !cursorRef.current) {
      return;
    }
    enVueloRef.current = true;
    try {
      const url = `/api/conversaciones/${conversacionId}/mensajes?after=${encodeURIComponent(cursorRef.current)}`;
      const respuesta = await fetch(url);

      if (respuesta.status === 401) {
        router.push(
          `/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }
      if (!respuesta.ok) {
        return;
      }

      const datos = (await respuesta.json()) as RespuestaPolling;
      const nuevos = datos.data?.mensajes ?? [];
      const leidosAhora = datos.data?.leidosAhora ?? [];

      if (leidosAhora.length > 0) {
        setIdsLeidos((previos) => {
          const proximos = new Set(previos);
          for (const id of leidosAhora) {
            proximos.add(id);
          }
          return proximos;
        });
      }

      if (nuevos.length === 0) {
        return;
      }

      const idsConocidos = new Set(mensajesRef.current.map((mensaje) => mensaje.id));
      const realmenteNuevos = nuevos.filter((mensaje) => !idsConocidos.has(mensaje.id));
      const deLaOtraParte = realmenteNuevos.filter(
        (mensaje) => mensaje.senderId !== usuarioId
      );

      if (deLaOtraParte.length > 0) {
        marcarLeidoEnServidor();
      }

      if (estaCercaDelFondo()) {
        autoscrollRef.current = true;
      } else if (deLaOtraParte.length > 0) {
        setMensajesNuevos((cantidad) => cantidad + deLaOtraParte.length);
      }

      setMensajes((previos) => integrarMensajes(previos, nuevos));
    } catch {
      // El polling es best-effort; ante un error se reintenta en el próximo ciclo.
    } finally {
      enVueloRef.current = false;
    }
  }, [conversacionId, marcarLeidoEnServidor, router, usuarioId]);

  // Polling mientras la conversación está abierta; solo consulta cuando la
  // pestaña está visible para no degradar el servidor en segundo plano.
  useEffect(() => {
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void consultarNuevos();
      }
    }, INTERVALO_POLLING_MS);

    return () => window.clearInterval(intervalo);
  }, [consultarNuevos]);

  // Auto-scroll al fondo en el montaje y al llegar mensajes nuevos si el
  // usuario estaba cerca del borde inferior.
  useEffect(() => {
    const tarea = requestAnimationFrame(() => {
      if (autoscrollRef.current) {
        scrollAlFondo(false);
        autoscrollRef.current = false;
      }
    });
    return () => cancelAnimationFrame(tarea);
  }, [mensajes]);

  function bajarAlFinal() {
    setMensajesNuevos(0);
    scrollAlFondo(true);
  }

  async function enviarMensaje(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const cuerpo = mensaje.trim();
    if (!cuerpo || enviando) {
      return;
    }

    const idTemporal = `${PREFIJO_ID_TEMPORAL}${crypto.randomUUID()}`;
    const provisional: MensajeChat = {
      id: idTemporal,
      senderId: usuarioId,
      body: cuerpo,
      readAt: null,
      createdAt: new Date().toISOString(),
      enviando: true,
    };

    setMensajes((previos) => [...previos, provisional]);
    setMensaje("");
    setEnviando(true);
    setError(null);
    autoscrollRef.current = true;

    try {
      const respuesta = await fetch(
        `/api/conversaciones/${conversacionId}/mensajes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensaje: cuerpo }),
        }
      );

      if (respuesta.status === 401) {
        setMensajes((previos) => previos.filter((m) => m.id !== idTemporal));
        router.push(
          `/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }

      const datos = (await respuesta.json().catch(() => null)) as
        | RespuestaEnvio
        | null;

      if (!respuesta.ok) {
        setMensajes((previos) => previos.filter((m) => m.id !== idTemporal));
        setError(
          datos?.error?.message ??
            "No se pudo enviar el mensaje. Intenta de nuevo."
        );
        return;
      }

      const real = datos?.data;
      if (real?.id) {
        setMensajes((previos) => {
          if (previos.some((m) => m.id === real.id)) {
            // El polling ya trajo el mensaje real: solo descartar el temporal.
            return previos.filter((m) => m.id !== idTemporal);
          }
          return previos.map((m) =>
            m.id === idTemporal ? { ...real, enviando: false } : m
          );
        });
      } else {
        // Fallback seguro: sin id real no hay forma de reconciliar; se descarta
        // el temporal para no dejar un mensaje fantasma.
        setMensajes((previos) => previos.filter((m) => m.id !== idTemporal));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-linea bg-superficie shadow-card">
      {/* Alto relativo al viewport (valor arbitrario): el chat ocupa la
          pantalla del teléfono y deja el composer siempre a la vista. */}
      <div
        ref={contenedorRef}
        role="log"
        aria-live="polite"
        className="h-[60dvh] min-h-72 space-y-3 overflow-y-auto bg-fondo/60 p-3 sm:p-4"
      >
        {mensajes.length > 0 ? (
          mensajes.map((mensaje) => {
            const esPropio = mensaje.senderId === usuarioId;
            const leido =
              esPropio &&
              (mensaje.readAt !== null || idsLeidos.has(mensaje.id));
            const IconoEstado = leido ? CheckCheck : Check;
            return (
              <div
                key={mensaje.id}
                className={esPropio ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={unirClases(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 shadow-xs sm:max-w-[75%]",
                    esPropio
                      ? "rounded-br-md bg-brand-700 text-white"
                      : "rounded-bl-md border border-linea bg-superficie text-tinta",
                    mensaje.enviando && "opacity-70",
                  )}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed">{mensaje.body}</p>
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <span
                      className={unirClases(
                        "text-xs",
                        esPropio ? "text-brand-100" : "text-tinta-tenue",
                      )}
                    >
                      {formateadorFecha.format(new Date(mensaje.createdAt))}
                    </span>
                    {esPropio ? (
                      <span role="img" aria-label={leido ? "Leído" : "Enviado"} title={leido ? "Leído" : "Enviado"}>
                        <IconoEstado
                          className={unirClases("size-3.5", leido ? "text-accent-300" : "text-brand-100")}
                          aria-hidden="true"
                        />
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-10 text-center text-sm text-tinta-tenue">
            Enviá un mensaje para comenzar la conversación.
          </p>
        )}
      </div>

      {mensajesNuevos > 0 ? (
        <div className="flex justify-center border-t border-linea bg-superficie px-4 py-2">
          <button
            type="button"
            onClick={bajarAlFinal}
            className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
          >
            {mensajesNuevos}{" "}
            {mensajesNuevos === 1 ? "mensaje nuevo" : "mensajes nuevos"}
          </button>
        </div>
      ) : null}

      <form onSubmit={enviarMensaje} className="border-t border-linea bg-superficie p-3 sm:p-4">
        <label htmlFor={`mensaje-${conversacionId}`} className="sr-only">
          Nuevo mensaje
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id={`mensaje-${conversacionId}`}
            value={mensaje}
            onChange={(evento) => setMensaje(evento.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Escribí un mensaje..."
            className={unirClases("min-h-11 resize-none", clasesControl(Boolean(error)))}
          />
          <button
            type="submit"
            disabled={enviando || !mensaje.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-5" aria-hidden="true" />
            <span className="sr-only">{enviando ? "Enviando..." : "Enviar"}</span>
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
