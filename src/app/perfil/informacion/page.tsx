import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { FormularioInformacion } from "@/components/perfil/formulario-informacion";
import { FormularioContrasena } from "@/components/perfil/formulario-contrasena";

export const dynamic = "force-dynamic";

export default async function InformacionPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in?redirect=/perfil/informacion");
  }

  const usuario = session.user;
  const etiquetaRol = usuario.role === "ADMIN" ? "Administrador" : "Usuario";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href="/perfil"
        className="text-sm font-medium text-brand-700 underline dark:text-brand-200"
      >
        Volver a Mi perfil
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-brand-900 dark:text-bone">
        Información del perfil
      </h1>

      <div className="mt-8 flex flex-col gap-6">
        <section className="rounded-lg border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-900">
            Datos personales
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            Tu nombre, apellido y DNI se usan para confirmar tus operaciones.
          </p>
          <div className="mt-4">
            <FormularioInformacion
              name={usuario.name}
              lastName={usuario.lastName ?? null}
              dni={usuario.dni ?? null}
              accountType={usuario.accountType}
            />
          </div>
        </section>

        <section className="rounded-lg border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-900">
            Datos de la cuenta
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 block text-sm font-medium text-brand-700">
                Correo electrónico
              </p>
              <p className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-900">
                {usuario.email}
              </p>
              <p className="mt-1 text-xs text-brand-600">
                Para cambiar el email se requiere configurar SMTP (pendiente).
              </p>
            </div>
            <div>
              <p className="mb-1 block text-sm font-medium text-brand-700">Rol</p>
              <p className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-900">
                {etiquetaRol}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-brand-100 pt-6">
            <h3 className="font-semibold text-brand-900">Cambiar contraseña</h3>
            <p className="mt-1 text-sm text-brand-600">
              Al cambiarla se cerrarán las demás sesiones activas.
            </p>
            <div className="mt-4">
              <FormularioContrasena />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}