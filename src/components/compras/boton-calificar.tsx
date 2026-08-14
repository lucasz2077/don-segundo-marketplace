"use client";

import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { FormularioResenia } from "./formulario-resenia";

type BotonCalificarProps = {
  compraId: string;
};

/**
 * CTA "Calificar" de la tarjeta de compra (D6): despliega el
 * FormularioResenia inline bajo la tarjeta, sin modal. Al calificar con
 * éxito el formulario se cierra; la página refresca y la compra pasa a
 * estado "calificada".
 */
export function BotonCalificar({ compraId }: BotonCalificarProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <Boton
        variante="secundario"
        onClick={() => setAbierto((anterior) => !anterior)}
        aria-expanded={abierto}
      >
        {abierto ? "Cerrar" : "Calificar"}
      </Boton>
      {abierto ? (
        <FormularioResenia
          compraId={compraId}
          onExito={() => setAbierto(false)}
        />
      ) : null}
    </div>
  );
}