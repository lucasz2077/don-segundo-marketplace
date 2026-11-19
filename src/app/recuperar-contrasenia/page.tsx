import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRecuperarContrasenia } from "@/components/auth/formulario-recuperar-contrasenia";
import { PanelAutenticacion } from "@/components/auth/panel-autenticacion";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

/** RF-03: pedido del enlace para restablecer la contraseña. */
export default function RecuperarContraseniaPage() {
  return (
    <PanelAutenticacion
      titulo="¿Olvidaste tu contraseña?"
      descripcion="Escribí el email de tu cuenta y te mandamos un enlace para elegir una nueva."
      pie={
        <>
          ¿Te acordaste?{" "}
          <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
            Ingresá
          </Link>
        </>
      }
    >
      <FormularioRecuperarContrasenia />
    </PanelAutenticacion>
  );
}
