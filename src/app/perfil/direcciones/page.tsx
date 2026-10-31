import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerDirecciones } from "@/lib/direcciones";
import { GestionDirecciones } from "@/components/perfil/gestion-direcciones";
import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";

export const dynamic = "force-dynamic";

export default async function DireccionesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in?redirect=/perfil/direcciones");
  }

  const direcciones = await obtenerDirecciones(session.user.id);

  return (
    <PaginaCuenta
      titulo="Direcciones"
      descripcion="Agregá y administrá tus direcciones de entrega."
    >
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
    </PaginaCuenta>
  );
}