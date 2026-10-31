"use client";

import { useEffect, useRef, useState } from "react";

type RespuestaNoLeidas = {
  data?: { cantidad?: number };
};

type ContadorNoLeidosProps = {
  /** Endpoint que responde `{ data: { cantidad } }`. */
  endpoint: "/api/conversaciones/no-leidas" | "/api/notificaciones/no-leidas";
};

/**
 * Burbuja con la cantidad de mensajes o notificaciones sin leer, superpuesta
 * a un ícono del header (el contenedor debe ser `relative`). Consulta la API
 * en el cliente para no bloquear el render del servidor y solo se muestra con
 * al menos un elemento sin leer. Se actualiza cuando la pestaña vuelve a estar
 * visible o recupera el foco. Para lectores de pantalla agrega "(N sin leer)"
 * al nombre del enlace.
 */
export function ContadorNoLeidos({ endpoint }: ContadorNoLeidosProps) {
  const [cantidad, setCantidad] = useState(0);
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
        const respuesta = await fetch(endpoint);
        if (!respuesta.ok) {
          return;
        }
        const datos = (await respuesta.json()) as RespuestaNoLeidas;
        if (activo) {
          setCantidad(datos.data?.cantidad ?? 0);
        }
      } catch {
        // La burbuja es informativa; ante un error se oculta silenciosamente.
      } finally {
        enVueloRef.current = false;
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
  }, [endpoint]);

  if (cantidad <= 0) {
    return null;
  }

  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-xs font-bold leading-none text-brand-950 ring-2 ring-brand-800">
      <span aria-hidden="true">{cantidad > 99 ? "99+" : cantidad}</span>
      <span className="sr-only">({cantidad} sin leer)</span>
    </span>
  );
}
