"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { IconoCategoria } from "@/components/categorias/icono-categoria";
import { unirClases } from "@/components/ui/unir-clases";
import type { CategoriaNavegacion } from "./tipos";
import { useDesplegable } from "./use-desplegable";

/**
 * Menú "Categorías" de la barra secundaria del header (desktop): panel con
 * todas las categorías raíz y sus subcategorías. La raíz lleva a su página;
 * cada subcategoría filtra el listado directamente.
 */
export function MenuCategorias({ categorias }: { categorias: CategoriaNavegacion[] }) {
  const { abierto, setAbierto, refContenedor, refDisparador } = useDesplegable();
  const cerrar = () => setAbierto(false);

  return (
    <div ref={refContenedor} className="relative">
      <button
        ref={refDisparador}
        type="button"
        onClick={() => setAbierto((anterior) => !anterior)}
        aria-expanded={abierto}
        aria-controls="menu-categorias"
        className="flex h-10 items-center gap-1 text-sm font-medium text-white hover:text-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        Categorías
        <ChevronDown
          className={unirClases("size-4 motion-safe:transition-transform", abierto && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {abierto ? (
        <div
          id="menu-categorias"
          className="absolute left-0 top-full z-50 mt-1 w-4xl rounded-card border border-linea bg-superficie p-6 shadow-modal"
        >
          <div className="grid grid-cols-3 gap-x-8 gap-y-6">
            {categorias.map((categoria) => {
              return (
                <div key={categoria.id}>
                  <Link
                    href={`/categorias/${categoria.slug}`}
                    onClick={cerrar}
                    className="group flex items-center gap-2 text-sm font-semibold text-tinta hover:text-brand-600"
                  >
                    <span className="flex size-8 items-center justify-center rounded-control bg-brand-50 text-brand-700 group-hover:bg-brand-100">
                      <IconoCategoria slug={categoria.slug} className="size-4" />
                    </span>
                    {categoria.name}
                    <ChevronRight
                      className="size-3.5 opacity-0 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </Link>
                  {categoria.children.length > 0 ? (
                    <ul className="mt-2 space-y-1 pl-10">
                      {categoria.children.map((subcategoria) => (
                        <li key={subcategoria.id}>
                          <Link
                            href={`/listados?categoria=${subcategoria.id}`}
                            onClick={cerrar}
                            className="text-sm text-tinta-tenue hover:text-brand-800 hover:underline"
                          >
                            {subcategoria.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-6 border-t border-linea pt-4">
            <Link
              href="/listados"
              onClick={cerrar}
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              Ver todas las publicaciones
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
