"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Boton } from "@/components/ui/boton";

type DialogoFiltrosProps = {
  cantidadFiltros: number;
  /** Panel de filtros renderizado en el servidor. */
  children: ReactNode;
};

/**
 * Botón "Filtrar" y hoja inferior con los filtros del listado en mobile y
 * tablet (debajo de lg). `<dialog>` modal nativo: atrapa el foco y cierra con
 * Escape. Al elegir un filtro (enlace) la hoja se cierra y la página navega;
 * el formulario de ubicación y precio también la cierra al enviarse. El alto
 * máximo de 90dvh (valor arbitrario) deja ver la página detrás de la hoja.
 */
export function DialogoFiltros({ cantidadFiltros, children }: DialogoFiltrosProps) {
  const refDialogo = useRef<HTMLDialogElement>(null);

  function cerrar() {
    refDialogo.current?.close();
  }

  function manejarClick(evento: MouseEvent<HTMLDialogElement>) {
    const destino = evento.target as HTMLElement;
    if (destino === evento.currentTarget || destino.closest("a")) {
      cerrar();
    }
  }

  return (
    <>
      <Boton
        variante="secundario"
        onClick={() => refDialogo.current?.showModal()}
        aria-haspopup="dialog"
        className="flex-1 sm:flex-none"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filtrar
        {cantidadFiltros > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
            {cantidadFiltros}
            <span className="sr-only"> filtros aplicados</span>
          </span>
        ) : null}
      </Boton>

      <dialog
        ref={refDialogo}
        onClick={manejarClick}
        onSubmit={cerrar}
        aria-labelledby="titulo-filtros"
        className="mx-auto mb-0 mt-auto max-h-[90dvh] w-full max-w-lg rounded-t-2xl bg-superficie p-0 shadow-modal backdrop:bg-brand-950/60 sm:mb-auto sm:rounded-2xl"
      >
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between border-b border-linea px-4 py-3">
            <h2 id="titulo-filtros" className="text-base font-semibold text-tinta">
              Filtros
            </h2>
            <button
              type="button"
              // Foco inicial en "Cerrar" al abrir: evita resaltar el primer enlace.
              autoFocus
              onClick={cerrar}
              className="flex size-10 items-center justify-center rounded-control text-tinta-suave hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Cerrar filtros</span>
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </dialog>
    </>
  );
}
