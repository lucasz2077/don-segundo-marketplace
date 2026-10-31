import { Contenedor } from "@/components/ui/contenedor";
import { AvisoCarga, EsqueletoGrillaTarjetas } from "@/components/ui/esqueletos";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Carga genérica (inicio y rutas sin loading propio): feedback inmediato al
 * navegar, clave en conexiones móviles lentas del campo.
 */
export default function Cargando() {
  return (
    <Contenedor as="main" className="flex-1 py-6 sm:py-10">
      <AvisoCarga texto="Cargando..." />
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8">
        <EsqueletoGrillaTarjetas />
      </div>
    </Contenedor>
  );
}
