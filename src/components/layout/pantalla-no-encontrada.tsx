import type { ReactNode } from "react";
import Image from "next/image";
import { SearchX } from "lucide-react";
import { Contenedor } from "@/components/ui/contenedor";

type PantallaNoEncontradaProps = {
  titulo: string;
  descripcion: string;
  /** Acciones útiles (BotonEnlace): a dónde seguir. */
  acciones: ReactNode;
};

/**
 * Pantalla 404 compartida: la global (`app/not-found.tsx`) y las de cada
 * zona (publicación, vendedor, admin), que explican qué pasó en ese contexto.
 * Mantiene header y footer.
 */
export function PantallaNoEncontrada({ titulo, descripcion, acciones }: PantallaNoEncontradaProps) {
  return (
    <Contenedor as="main" className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="relative">
        <Image src="/marca/isotipo-azul.svg" alt="" width={104} height={100} className="opacity-90" />
        <span className="absolute -bottom-1 -right-3 flex size-10 items-center justify-center rounded-full bg-accent-500 text-brand-950 ring-4 ring-fondo">
          <SearchX className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-accent-700">
        Error 404
      </p>
      <h1 className="mt-2 font-marca text-4xl font-medium text-tinta">{titulo}</h1>
      <p className="mt-3 max-w-md text-tinta-suave">{descripcion}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">{acciones}</div>
    </Contenedor>
  );
}
