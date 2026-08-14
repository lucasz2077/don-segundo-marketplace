import { Skeleton } from "@/components/ui/skeleton";

/**
 * Estado de carga de /compras (E3): esqueletos que respetan la forma de la
 * página (título + filas de compra) mientras el RSC resuelve la sesión y la
 * consulta.
 */
export default function CargandoCompras() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Skeleton className="h-9 w-48" />
      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </main>
  );
}