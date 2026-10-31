import { Contenedor } from "@/components/ui/contenedor";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Estado de carga de /compras (E3): esqueletos con la forma de la página
 * (navegación de la cuenta en desktop, título y tarjetas de compra) mientras
 * el RSC resuelve la sesión y la consulta.
 */
export default function CargandoCompras() {
  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <span className="sr-only" role="status">
        Cargando tus compras...
      </span>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Skeleton className="hidden h-96 lg:block" />
        <div className="lg:col-span-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <div className="mt-5 flex flex-col gap-3 sm:gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </Contenedor>
  );
}
