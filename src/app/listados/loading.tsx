import { Contenedor } from "@/components/ui/contenedor";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Carga de /listados: respeta la forma de la página (título, barra de
 * filtros y tarjetas horizontales en mobile / grilla en desktop) para que no
 * salte el layout al llegar los resultados.
 */
export default function CargandoListados() {
  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <span className="sr-only" role="status">
        Cargando publicaciones...
      </span>
      <Skeleton className="h-7 w-56" />
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Skeleton className="hidden h-96 lg:block" />
        <div className="lg:col-span-3">
          <div className="flex gap-2 lg:justify-end">
            <Skeleton className="h-11 flex-1 lg:hidden" />
            <Skeleton className="h-11 flex-1 sm:w-56 sm:flex-none" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, indice) => (
              <div
                key={indice}
                className="flex overflow-hidden rounded-card border border-linea bg-superficie sm:flex-col"
              >
                <Skeleton className="h-36 w-36 shrink-0 rounded-none sm:aspect-4/3 sm:h-auto sm:w-full" />
                <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Contenedor>
  );
}
