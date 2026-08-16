"use client";

import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { FormularioDevolucion } from "./formulario-devolucion";

type BotonSolicitarDevolucionProps = {
  compraId: string;
};

/**
 * CTA "Solicitar devolución" de la tarjeta de compra (RF-49/5.4): despliega
 * el FormularioDevolucion inline bajo la tarjeta, sin modal (mismo patrón
 * que BotonCalificar). Solo se muestra en compras APROBADAS dentro de la
 * ventana de 7 días y sin solicitud PENDIENTE (lo decide la página server).
 */
export function BotonSolicitarDevolucion({
  compraId,
}: BotonSolicitarDevolucionProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <Boton
        variante="secundario"
        onClick={() => setAbierto((anterior) => !anterior)}
        aria-expanded={abierto}
      >
        {abierto ? "Cerrar" : "Solicitar devolución"}
      </Boton>
      {abierto ? (
        <FormularioDevolucion
          compraId={compraId}
          onExito={() => setAbierto(false)}
        />
      ) : null}
    </div>
  );
}