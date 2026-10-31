"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Contenedor } from "@/components/ui/contenedor";

type ErrorPaginaProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/**
 * Error inesperado de una página (fuera del layout raíz). Mantiene header y
 * footer, explica qué pasó y permite reintentar el render del segmento o
 * volver al inicio. El código de referencia (digest) ayuda a soporte a
 * encontrar el error en los logs sin exponer detalles internos.
 */
export default function ErrorPagina({ error, retry }: ErrorPaginaProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Contenedor as="main" className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-danger/10 text-danger">
        <TriangleAlert className="size-8" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold text-tinta">Algo salió mal</h1>
      <p className="mt-3 max-w-md text-tinta-suave">
        No pudimos cargar esta página. Puede ser un problema momentáneo: intentá de nuevo en
        unos segundos.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-tinta-tenue">Código de referencia: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Boton onClick={() => retry()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Reintentar
        </Boton>
        <BotonEnlace href="/" variante="secundario">
          Volver al inicio
        </BotonEnlace>
      </div>
    </Contenedor>
  );
}
