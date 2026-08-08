import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const etiquetasRol: Record<string, string> = {
  USER: "Usuario",
  ADMIN: "Administrador",
};

const etiquetasTipoCuenta: Record<string, string> = {
  BUYER: "Comprador",
  SELLER: "Vendedor",
  BOTH: "Comprador y vendedor",
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const rol = etiquetasRol[session.user.role] ?? session.user.role;
  const tipoCuenta =
    etiquetasTipoCuenta[session.user.accountType] ?? session.user.accountType;

  return (
    <main className="flex flex-1 items-center justify-center bg-bone px-4">
      <div className="w-full max-w-md rounded-lg border border-brand-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-brand-900">Panel</h1>
        <p className="mt-2 text-sm text-brand-600">
          Bienvenido/a,{" "}
          <span className="font-medium text-brand-900">
            {session.user.name}
          </span>
          .
        </p>
        <dl className="mt-6 flex flex-col gap-2 rounded-md bg-bone p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-brand-600">Correo electrónico</dt>
            <dd className="font-medium text-brand-900">
              {session.user.email}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-600">Rol</dt>
            <dd className="font-medium text-brand-900">{rol}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-600">Tipo de cuenta</dt>
            <dd className="font-medium text-brand-900">{tipoCuenta}</dd>
          </div>
        </dl>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-brand-700 underline"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
