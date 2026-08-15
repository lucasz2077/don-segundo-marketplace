"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type BotonComprarProps = {
  listingId: string;
  sesionIniciada: boolean;
};

type RespuestaCompra = {
  data?: {
    compra?: { id: string; estadoPago: string };
    initPoint?: string;
  };
  error?: { code?: string; message?: string };
};

const MENSAJE_SIN_STOCK =
  "Sin stock. La publicación puede haberse vendido recién.";
const MENSAJE_PAGO_INDISPONIBLE =
  "El pago no está disponible en este momento. Intentá de nuevo en unos minutos.";
const MENSAJE_ERROR_GENERICO =
  "No se pudo concretar la compra. Intenta de nuevo.";

/**
 * Botón de compra directa del detalle de publicación. Sin sesión redirige al
 * login con la ruta actual; con sesión llama a POST
 * /api/listings/[id]/comprar, que crea la orden y la preferencia de pago en
 * Mercado Pago (RF-39), y redirige al checkout usando el `initPoint` de la
 * respuesta. Maneja los errores de negocio de forma visible (409 sin stock,
 * 502 pago no disponible) y el 401 reenviando al login. La confirmación del
 * pago llega por el webhook de pagos, por lo que aquí no se muestra
 * referencia de compra.
 */
export function BotonComprar({ listingId, sesionIniciada }: BotonComprarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (respuesta.status === 409) {
          setError(MENSAJE_SIN_STOCK);
        } else if (respuesta.status === 502) {
          setError(datos?.error?.message ?? MENSAJE_PAGO_INDISPONIBLE);
        } else {
          setError(MENSAJE_ERROR_GENERICO);
        }
        return;
      }

      const initPoint = datos?.data?.initPoint;
      if (!initPoint) {
        setError(MENSAJE_ERROR_GENERICO);
        return;
      }
      window.location.href = initPoint;
    } catch {
      setError(MENSAJE_ERROR_GENERICO);
    } finally {
      setCargando(false);
    }
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
