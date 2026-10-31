import { AvisoCarga } from "@/components/ui/esqueletos";
import { Skeleton } from "@/components/ui/skeleton";

/** Carga del detalle: galería a todo el ancho en mobile y caja de compra. */
export default function CargandoDetalle() {
  return (
    <main className="flex-1 pb-12">
      <AvisoCarga texto="Cargando publicación..." />
      <div className="mx-auto w-full max-w-sitio sm:px-6 sm:pt-4">
        <Skeleton className="hidden h-4 w-72 sm:block" />
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:mt-4 lg:grid-cols-12">
          <Skeleton className="aspect-4/3 w-full rounded-none sm:rounded-card lg:col-span-7" />
          <div className="flex flex-col gap-3 px-4 sm:px-0 lg:col-span-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
