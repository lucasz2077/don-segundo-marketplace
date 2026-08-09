"use client";

import { useEffect, useState } from "react";

type RespuestaNoLeidas = {
  data?: { cantidad?: number };
};

/**
 * Badge con la cantidad de notificaciones sin leer del usuario. Consulta la
 * API en el cliente para que el contador se actualice sin bloquear el render
 * del servidor. Solo se muestra cuando hay al menos una notificación sin leer.
 */
export function ContadorNotificaciones() {
  const [cantidad, setCantidad] = useState(0);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    let activo = true;

    fetch("/api/notificaciones/no-leidas")
      .then(async (respuesta) => {
        if (!respuesta.ok) {
          return;
        }
        const datos = (await respuesta.json()) as RespuestaNoLeidas;
        if (activo) {
          setCantidad(datos.data?.cantidad ?? 0);
        }
      })
      .catch(() => {
        // El badge es informativo; ante un error se oculta silenciosamente.
      })
      .finally(() => {
        if (activo) {
          setCargado(true);
        }
      });

    return () => {
      activo = false;
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