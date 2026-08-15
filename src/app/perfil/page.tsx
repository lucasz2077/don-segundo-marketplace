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
        <Link href="/perfil/verificacion" className={estiloCard}>
          <h2 className="text-lg font-semibold text-brand-900">
            Verificación de vendedor
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            Estado de tu verificación y solicitud.
          </p>
        </Link>
        {/* La card de perfil público lleva dos acciones (editar y ver el
            perfil público), así que es un div y no un Link completo como las
            otras tres cards: un enlace dentro de otro enlace es HTML inválido. */}
        <div className={estiloCard}>
          <h2 className="text-lg font-semibold text-brand-900">
            Perfil público
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            Tu bio y tu nombre comercial, visibles para los compradores.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/perfil/publico"
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              Editar perfil
            </Link>
            <Link
              href={`/vendedores/${session.user.id}`}
              className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              Ver mi perfil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}