"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

function FormularioBusqueda({ valorInicial }: { valorInicial: string }) {
  return (
    <form action="/listados" method="GET" role="search" className="relative w-full">
      <label htmlFor="busqueda-header" className="sr-only">
        Buscar publicaciones
      </label>
      <input
        // La key remonta el input cuando cambia la búsqueda en la URL, para
        // reflejar la consulta vigente sin volverlo controlado.
        key={valorInicial}
        id="busqueda-header"
        type="search"
        name="q"
        defaultValue={valorInicial}
        placeholder="Buscar tractores, semillas, hacienda..."
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-control border-0 bg-superficie pl-4 pr-12 text-base text-tinta shadow-card placeholder:text-tinta-tenue/80 focus:outline-none focus:ring-2 focus:ring-accent-400 sm:text-sm"
      />
      <button
        type="submit"
        className="absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-control text-tinta-suave hover:bg-brand-50 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Search className="size-5" aria-hidden="true" />
        <span className="sr-only">Buscar</span>
      </button>
    </form>
  );
}

function BuscadorConParametros() {
  const pathname = usePathname();
  const parametros = useSearchParams();
  const consulta = pathname === "/listados" ? (parametros.get("q") ?? "") : "";
  return <FormularioBusqueda valorInicial={consulta} />;
}

/**
 * Buscador central del header: formulario GET a /listados (funciona sin
 * JavaScript). En /listados muestra la búsqueda vigente. useSearchParams va
 * dentro de Suspense para no forzar render dinámico en páginas estáticas.
 */
export function BuscadorHeader() {
  return (
    <Suspense fallback={<FormularioBusqueda valorInicial="" />}>
      <BuscadorConParametros />
    </Suspense>
  );
}
