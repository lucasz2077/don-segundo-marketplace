import Link from "next/link";
import { FormularioIngreso } from "@/components/auth/formulario-ingreso";
import { PanelAutenticacion } from "@/components/auth/panel-autenticacion";

type SignInPageProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

/**
 * Solo acepta destinos internos ("/compras", "/listados/..."): evita que un
 * enlace de ingreso con `?redirect=https://...` lleve a un sitio externo.
 */
function destinoSeguro(valor: string | string[] | undefined): string {
  if (typeof valor !== "string" || !valor.startsWith("/") || valor.startsWith("//")) {
    return "/listados";
  }
  return valor;
}

/**
 * Ingreso. Server Component: el destino posterior al login (`?redirect=`) se
 * lee y valida en el servidor, así la página se renderiza completa sin
 * esperar al cliente (sin saltos de layout).
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect } = await searchParams;

  return (
    <PanelAutenticacion
      titulo="Ingresá a tu cuenta"
      descripcion="Comprá, vendé y seguí tus publicaciones del campo."
      pie={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/sign-up" className="font-semibold text-brand-700 hover:underline">
            Creá una gratis
          </Link>
        </>
      }
    >
      <FormularioIngreso redirectTo={destinoSeguro(redirect)} />
    </PanelAutenticacion>
  );
}
