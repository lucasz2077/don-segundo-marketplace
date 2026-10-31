"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Estado de un panel desplegable (menú de usuario, categorías): se cierra al
 * hacer click o tocar fuera del contenedor y con Escape, devolviendo el foco
 * al botón que lo abrió.
 */
export function useDesplegable<
  Contenedor extends HTMLElement = HTMLDivElement,
  Disparador extends HTMLElement = HTMLButtonElement,
>() {
  const [abierto, setAbierto] = useState(false);
  const refContenedor = useRef<Contenedor>(null);
  const refDisparador = useRef<Disparador>(null);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    function manejarPuntero(evento: PointerEvent) {
      if (!refContenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }

    function manejarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAbierto(false);
        refDisparador.current?.focus();
      }
    }

    document.addEventListener("pointerdown", manejarPuntero);
    document.addEventListener("keydown", manejarTecla);
    return () => {
      document.removeEventListener("pointerdown", manejarPuntero);
      document.removeEventListener("keydown", manejarTecla);
    };
  }, [abierto]);

  return { abierto, setAbierto, refContenedor, refDisparador };
}
