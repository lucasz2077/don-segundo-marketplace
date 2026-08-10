"use client";

import { useEffect, useRef, useState } from "react";

type RespuestaNoLeidas = {
  data?: { cantidad?: number };
};

/**
 * Badge con la cantidad de mensajes sin leer del usuario. Consulta la API en
 * el cliente para que el contador se actualice sin bloquear el render del
 * servidor. Solo se muestra cuando hay al menos un mensaje sin leer. Se
 * actualiza además cuando la pestaña vuelve a estar visible o recupera el
 * foco, para reflejar mensajes recibidos mientras estaba en segundo plano.
 */
export function ContadorMensajes() {
  const [cantidad, setCantidad] = useState(0);
  const [cargado, setCargado] = useState(false);
  const enVueloRef = useRef(false);

  useEffect(() => {
    let activo = true;

    async function actualizar() {
      // Ignora llamadas mientras haya una petición en vuelo.
      if (enVueloRef.current) {
        return;
      }
      enVueloRef.current = true;
      try {
        const respuesta = await fetch("/api/conversaciones/no-leidas");
        if (!respuesta.ok) {
          return;
        }
        const datos = (await respuesta.json()) as RespuestaNoLeidas;
        if (activo) {
          setCantidad(datos.data?.cantidad ?? 0);
        }
      } catch {
        // El badge es informativo; ante un error se oculta silenciosamente.
      } finally {
        enVueloRef.current = false;
        if (activo) {
          setCargado(true);
        }
      }
    }

    function manejarVisibilidad() {
      if (document.visibilityState === "visible") {
        void actualizar();
      }
    }

    void actualizar();
    document.addEventListener("visibilitychange", manejarVisibilidad);
    window.addEventListener("focus", manejarVisibilidad);

    return () => {
      activo = false;
      document.removeEventListener("visibilitychange", manejarVisibilidad);
      window.removeEventListener("focus", manejarVisibilidad);
    };
  }, []);

  if (!cargado || cantidad <= 0) {
    return null;
  }

  return (
    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold leading-none text-brand-950">
      {cantidad > 99 ? "99+" : cantidad}
    </span>
  );
}