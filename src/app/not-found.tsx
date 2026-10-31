import Image from "next/image";
import { SearchX } from "lucide-react";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Contenedor } from "@/components/ui/contenedor";

/**
 * 404 global (rutas inexistentes y `notFound()` de publicaciones, vendedores
 * o categorías). Mantiene header y footer, explica qué pasó y ofrece volver
 * a buscar o al inicio.
 */
export default function NoEncontrada() {
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
      <h1 className="mt-2 font-marca text-4xl font-medium text-tinta">
        No encontramos esta página
      </h1>
      <p className="mt-3 max-w-md text-tinta-suave">
        Puede que la publicación ya no esté disponible o que el enlace tenga un error. Probá
        buscando desde el header o explorá las publicaciones activas.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <BotonEnlace href="/listados">Explorar publicaciones</BotonEnlace>
        <BotonEnlace href="/" variante="secundario">
          Volver al inicio
        </BotonEnlace>
      </div>
    </Contenedor>
  );
}
