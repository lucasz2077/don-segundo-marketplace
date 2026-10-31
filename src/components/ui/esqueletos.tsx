import { Contenedor } from "./contenedor";
import { Skeleton } from "./skeleton";

/** Tarjeta de publicación vertical en carga (misma forma que TarjetaPublicacion). */
export function EsqueletoTarjeta() {
  return (
    <div className="overflow-hidden rounded-card border border-linea bg-superficie">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/** Aviso accesible de carga: los esqueletos son decorativos (aria-hidden). */
export function AvisoCarga({ texto }: { texto: string }) {
  return (
    <span className="sr-only" role="status">
      {texto}
    </span>
  );
}

/** Grilla de tarjetas en carga: 2 columnas en mobile, 4 en desktop. */
export function EsqueletoGrillaTarjetas({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: cantidad }, (_, indice) => (
        <EsqueletoTarjeta key={indice} />
      ))}
    </div>
  );
}

/**
 * Página del área "Mi cuenta" en carga: navegación lateral (desktop), título
 * y filas. Comparte forma con PaginaCuenta para que no salte el layout.
 */
export function EsqueletoCuenta({ texto, filas = 3 }: { texto: string; filas?: number }) {
  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <AvisoCarga texto={texto} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Skeleton className="hidden h-96 lg:block" />
        <div className="lg:col-span-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <div className="mt-5 flex flex-col gap-3 sm:gap-4">
            {Array.from({ length: filas }, (_, indice) => (
              <Skeleton key={indice} className="h-28 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Contenedor>
  );
}
