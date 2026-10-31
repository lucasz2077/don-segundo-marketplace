"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { unirClases } from "@/components/ui/unir-clases";

type BotonComprarProps = {
  listingId: string;
  sesionIniciada: boolean;
  /** Tamaño compacto para la barra fija inferior de mobile. */
  compacto?: boolean;
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
  "No se pudo concretar la compra. Intentá de nuevo.";

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
export function BotonComprar({ listingId, sesionIniciada, compacto = false }: BotonComprarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tamanio = compacto ? "md" : "lg";

  if (!sesionIniciada) {
    return (
      <BotonEnlace
        href={`/sign-in?redirect=${encodeURIComponent(pathname)}`}
        variante="acento"
        tamanio={tamanio}
        anchoCompleto
      >
        <ShoppingBag className="size-5" aria-hidden="true" />
        Comprar ahora
      </BotonEnlace>
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
    <div className="w-full">
      <Boton
        variante="acento"
        tamanio={tamanio}
        anchoCompleto
        onClick={comprar}
        cargando={cargando}
      >
        {cargando ? null : <ShoppingBag className="size-5" aria-hidden="true" />}
        {cargando ? "Yendo a Mercado Pago..." : "Comprar ahora"}
      </Boton>
      {error ? (
        <p role="alert" className={unirClases("text-sm text-danger", compacto ? "mt-1" : "mt-2")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
