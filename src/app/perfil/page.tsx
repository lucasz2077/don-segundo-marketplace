import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const estiloCard =
  "rounded-lg border border-brand-100 bg-white p-6 shadow-sm transition-colors hover:border-brand-300";

export default async function PerfilPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in?redirect=/perfil");
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-900 dark:text-bone">
        Mi perfil
      </h1>
      <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
        Gestioná tus datos personales, tus direcciones de entrega y tus publicaciones.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/perfil/informacion" className={estiloCard}>
          <h2 className="text-lg font-semibold text-brand-900">
            Información del perfil
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            Nombre, apellido, DNI, tipo de cuenta y contraseña.
          </p>
        </Link>
        <Link href="/perfil/direcciones" className={estiloCard}>
          <h2 className="text-lg font-semibold text-brand-900">Direcciones</h2>
          <p className="mt-1 text-sm text-brand-600">
            Agregá y administrá tus direcciones de entrega.
          </p>
        </Link>
        <Link href="/perfil/publicaciones" className={estiloCard}>
          <h2 className="text-lg font-semibold text-brand-900">
            Mis publicaciones
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            Consultá el stock, pausá o reanudá tus publicaciones y editalas.
          </p>
        </Link>
      </div>
    </main>
  );
}