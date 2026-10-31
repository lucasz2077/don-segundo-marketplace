import { Contenedor } from "@/components/ui/contenedor";
import { AvisoCarga, EsqueletoGrillaTarjetas } from "@/components/ui/esqueletos";
import { Skeleton } from "@/components/ui/skeleton";

/** Carga de la página de categoría: encabezado, chips y grilla. */
export default function CargandoCategoria() {
  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <AvisoCarga texto="Cargando categoría..." />
      <Skeleton className="h-4 w-48" />
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="size-12 rounded-full sm:size-14" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="mt-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, indice) => (
          <Skeleton key={indice} className="h-10 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-8">
        <EsqueletoGrillaTarjetas />
      </div>
    </Contenedor>
  );
}
