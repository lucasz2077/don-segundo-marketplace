"use client";

import { useEffect } from "react";
import "./globals.css";

type ErrorGlobalProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/**
 * Error del layout raíz (p. ej. si falla la sesión del header). Reemplaza el
 * documento completo, así que define su propio html/body y no usa header,
 * footer ni fuentes de next/font: solo los tokens de globals.css.
 */
export default function ErrorGlobal({ error, retry }: ErrorGlobalProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-fondo px-4 text-center text-tinta">
        <title>Algo salió mal — Don Segundo</title>
        {/* eslint-disable-next-line @next/next/no-img-element -- fuera del layout raíz, sin optimización de imágenes */}
        <img src="/marca/isotipo-azul.svg" alt="" width={84} height={81} />
        <h1 className="mt-6 text-2xl font-semibold">Algo salió mal</h1>
        <p className="mt-3 max-w-md text-tinta-suave">
          Don Segundo no está respondiendo como debería. Intentá de nuevo en unos segundos.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-tinta-tenue">Código de referencia: {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => retry()}
            className="min-h-11 rounded-control bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Reintentar
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- recarga completa: el layout raíz falló */}
          <a
            href="/"
            className="flex min-h-11 items-center justify-center rounded-control border border-linea-fuerte bg-superficie px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Volver al inicio
          </a>
        </div>
      </body>
    </html>
  );
}
