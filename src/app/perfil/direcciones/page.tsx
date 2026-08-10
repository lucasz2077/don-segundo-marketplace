import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerDirecciones } from "@/lib/direcciones";
import { GestionDirecciones } from "@/components/perfil/gestion-direcciones";

export const dynamic = "force-dynamic";

export default async function DireccionesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in?redirect=/perfil/direcciones");
  }

  const direcciones = await obtenerDirecciones(session.user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Link
        href="/perfil"
        className="text-sm font-medium text-brand-700 underline dark:text-brand-200"
      >
        Volver a Mi perfil
      </Link>

      <div className="mt-8">
        <GestionDirecciones
          direcciones={direcciones.map((direccion) => ({
            id: direccion.id,
            calle: direccion.calle,
            ciudad: direccion.ciudad,
            provincia: direccion.provincia,
            codigoPostal: direccion.codigoPostal,
            pisoDepto: direccion.pisoDepto,
            referencia: direccion.referencia,
            esPredeterminada: direccion.esPredeterminada,
          }))}
        />
      </div>
    </main>
  );
}