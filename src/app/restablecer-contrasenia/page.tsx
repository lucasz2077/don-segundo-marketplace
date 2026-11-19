import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRestablecerContrasenia } from "@/components/auth/formulario-restablecer-contrasenia";
import { PanelAutenticacion } from "@/components/auth/panel-autenticacion";
import { Alerta } from "@/components/ui/alerta";
import { BotonEnlace } from "@/components/ui/boton-enlace";

export const metadata: Metadata = { title: "Elegir contraseña nueva · Don Segundo" };

type RestablecerContraseniaPageProps = {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
};

/**
 * RF-03: destino del enlace del mail. Better Auth valida el token y redirige
 * acá con `?token=` (válido) o con `?error=INVALID_TOKEN` (vencido o usado).
 */
export default async function RestablecerContraseniaPage({
  searchParams,
}: RestablecerContraseniaPageProps) {
  const { token, error } = await searchParams;
  const tokenValido = typeof token === "string" && token.length > 0 && !error;

  return (
    <PanelAutenticacion
      titulo="Elegí una contraseña nueva"
      descripcion="Usá al menos 8 caracteres. Después vas a poder ingresar con ella."
      pie={
        <>
          ¿Ya la recordaste?{" "}
          <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
            Ingresá
          </Link>
        </>
      }
    >
      {tokenValido ? (
        <FormularioRestablecerContrasenia token={token} />
      ) : (
        <Alerta
          tono="advertencia"
          titulo="El enlace venció o ya se usó"
          accion={<BotonEnlace href="/recuperar-contrasenia">Pedir un enlace nuevo</BotonEnlace>}
        >
          Los enlaces para cambiar la contraseña duran 1 hora y sirven una sola vez.
        </Alerta>
      )}
    </PanelAutenticacion>
  );
}
