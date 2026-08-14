"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type BotonComprarProps = {
  listingId: string;
  sesionIniciada: boolean;
};

type RespuestaCompra = {
  data?: { compraId?: string };
  error?: { message?: string };
};

/**
 * Botón de compra directa del detalle de publicación. Sin sesión redirige al
 * login con la ruta actual; con sesión llama a POST
 * /api/listings/[id]/comprar, maneja los errores de negocio de forma visible
 * (409 sin stock, 403, 401) y al éxito muestra una confirmación con la
 * referencia de la compra (compraId del contrato, RF-26) y refresca la página
 * para reflejar el nuevo stock.
 */
export function BotonComprar({ listingId, sesionIniciada }: BotonComprarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comprada, setComprada] = useState(false);
  const [compraId, setCompraId] = useState<string | null>(null);

  if (!sesionIniciada) {
    return (
      <Link
        href={`/sign-in?redirect=${encodeURIComponent(pathname)}`}
        className="inline-block rounded-md bg-brand-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
      >
        Comprar
      </Link>
    );
  }

  async function comprar() {
    if (cargando) {
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/listings/${listingId}/comprar`, {
        method: "POST",
      });

      if (respuesta.status === 401) {
        router.push(
          `/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }

      const datos = (await respuesta.json().catch(() => null)) as
        | RespuestaCompra
        | null;

      if (!respuesta.ok) {
        setError(
          respuesta.status === 409
            ? "Sin stock. La publicación puede haberse vendido recién."
            : datos?.error?.message ??
                "No se pudo concretar la compra. Intenta de nuevo."
        );
        return;
      }

      setComprada(true);
      setCompraId(datos?.data?.compraId ?? null);
      router.refresh();
    } catch {
      setError("No se pudo concretar la compra. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (comprada) {
    return (
      <div className="rounded-md bg-brand-50 px-4 py-3">
        <p className="text-sm font-medium text-brand-900">
          ¡Gracias por tu compra!
        </p>
        {compraId ? (
          <p className="mt-1 text-xs text-brand-600">
            Referencia de compra: {compraId}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={comprar}
        disabled={cargando}
        className="rounded-md bg-brand-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cargando ? "Comprando..." : "Comprar"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}