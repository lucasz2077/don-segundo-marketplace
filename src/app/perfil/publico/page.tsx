import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerMiPerfil } from "@/lib/perfiles";
import { FormularioPerfilPublico } from "@/components/perfil/formulario-perfil-publico";

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href="/perfil"
        className="text-sm font-medium text-brand-700 underline dark:text-brand-200"
      >
        Volver a Mi perfil
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-brand-900 dark:text-bone">
        Perfil público
      </h1>
      <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
        Contale a los compradores quién sos. Tu bio y tu nombre comercial se
        muestran en tu perfil público.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <section className="rounded-lg border border-brand-100 bg-white p-6 shadow-sm">
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

        <section className="rounded-lg border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-900">
            Vista previa
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            Así te ven los compradores cuando visitan tu perfil.
          </p>
          <Link
            href={`/vendedores/${session.user.id}`}
            className="mt-4 inline-block rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            Ver mi perfil
          </Link>
        </section>
      </div>
    </main>
  );
}
