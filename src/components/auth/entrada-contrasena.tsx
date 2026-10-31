"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Entrada } from "@/components/ui/campo";
import { unirClases } from "@/components/ui/unir-clases";

type EntradaContrasenaProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalido?: boolean;
};

/**
 * Campo de contraseña con botón para mostrarla u ocultarla: en el teléfono
 * evita errores de tipeo sin obligar a escribirla dos veces a ciegas.
 */
export function EntradaContrasena({ className, ...props }: EntradaContrasenaProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Entrada {...props} type={visible ? "text" : "password"} className={unirClases("pr-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((anterior) => !anterior)}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-control text-tinta-tenue hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {visible ? (
          <EyeOff className="size-5" aria-hidden="true" />
        ) : (
          <Eye className="size-5" aria-hidden="true" />
        )}
        <span className="sr-only">{visible ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
      </button>
    </div>
  );
}
