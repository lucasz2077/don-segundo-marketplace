import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerMiPerfil } from "@/lib/perfiles";
import { FormularioPerfilPublico } from "@/components/perfil/formulario-perfil-publico";
import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";
import { clasesBoton } from "@/components/ui/boton";

export const dynamic = "force-dynamic";

/**
 * Página de edición del perfil público propio (bio y businessName).
 * Precarga los valores actuales del Profile (si existe) para el formulario
 * client, que guarda vía PATCH /api/perfil con lazy upsert (REQ-9). Incluye
 * el link "Ver mi perfil" al perfil público del vendedor (REQ-10).
 */
export default async function PerfilPublicoPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/perfil/publico");
  }

  const perfil = await obtenerMiPerfil(session.user.id);

  return (
    <PaginaCuenta
      titulo="Perfil público"
      descripcion="Contale a los compradores quién sos: tu bio y tu nombre comercial se muestran en tu perfil."
    >
<div className="flex flex-col gap-4 sm:gap-6">
        <section className="rounded-card border border-linea bg-superficie p-4 shadow-card sm:p-6">
          <h2 className="text-lg font-semibold text-brand-900">
            Datos de tu perfil público
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            Estos datos se guardan al primer guardado; podés actualizarlos
            cuando quieras.
          </p>
          <div className="mt-4">
            <FormularioPerfilPublico
              bio={perfil.bio}
              businessName={perfil.businessName}
            />
          </div>
        </section>

        <section className="rounded-card border border-linea bg-superficie p-4 shadow-card sm:p-6">
          <h2 className="text-lg font-semibold text-brand-900">
            Vista previa
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            Así te ven los compradores cuando visitan tu perfil.
          </p>
          <Link
            href={`/vendedores/${session.user.id}`}
            className={`mt-4 ${clasesBoton({ variante: "secundario" })}`}
          >
            Ver mi perfil
          </Link>
        </section>
      </div>
    </PaginaCuenta>
  );
}
