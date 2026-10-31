"use client";

import { useEffect, useState } from "react";
import type { Moneda } from "@/lib/formato";
import { Precio } from "@/components/ui/precio";
import { unirClases } from "@/components/ui/unir-clases";
import { BotonComprar } from "./boton-comprar";

type BarraCompraMovilProps = {
  /** id del bloque de compra principal: la barra aparece cuando sale de pantalla. */
  idCajaCompra: string;
  listingId: string;
  precio: string;
  moneda: Moneda;
  sesionIniciada: boolean;
};

/**
 * Barra fija inferior del detalle en mobile y tablet (debajo de lg): precio y
 * "Comprar ahora" siempre a mano del pulgar. Solo aparece cuando la caja de
 * compra principal ya quedó arriba, fuera de la pantalla, para no duplicar la
 * acción a la vista, y se oculta al llegar al footer. Respeta el área segura
 * inferior de los teléfonos (valor arbitrario con env()).
 */
export function BarraCompraMovil({
  idCajaCompra,
  listingId,
  precio,
  moneda,
  sesionIniciada,
}: BarraCompraMovilProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const caja = document.getElementById(idCajaCompra);
    const pie = document.querySelector("footer");
    if (!caja) {
      return;
    }
    let cajaArriba = false;
    let pieVisible = false;
    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (entrada.target === caja) {
          // La caja salió por arriba: el usuario ya scrolleó más allá.
          cajaArriba = !entrada.isIntersecting && entrada.boundingClientRect.top < 0;
        } else {
          pieVisible = entrada.isIntersecting;
        }
      }
      // Con el footer a la vista se oculta para no taparlo.
      setVisible(cajaArriba && !pieVisible);
    });
    observador.observe(caja);
    if (pie) {
      observador.observe(pie);
    }
    return () => observador.disconnect();
  }, [idCajaCompra]);

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={unirClases(
        "fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-superficie/95 pb-[env(safe-area-inset-bottom)] shadow-modal backdrop-blur motion-safe:transition-transform lg:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-sitio items-center gap-3 px-4 py-3 sm:px-6">
        <Precio precio={precio} moneda={moneda} tamanio="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <BotonComprar listingId={listingId} sesionIniciada={sesionIniciada} compacto />
        </div>
      </div>
    </div>
  );
}
