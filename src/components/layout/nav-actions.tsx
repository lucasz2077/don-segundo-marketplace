"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ContadorMensajes } from "@/components/layout/contador-mensajes";
import { ContadorNotificaciones } from "@/components/layout/contador-notificaciones";

type NavActionsProps = {
  user: {
    name: string;
    email: string;
    role: string;
  } | null;
};

export function NavActions({ user }: NavActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-brand-700 transition-colors hover:text-brand-900"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Registrarse
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/publicar"
        className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-brand-950 transition-colors hover:bg-accent-400"
      >
        Publicar
      </Link>
      <Link
        href="/favoritos"
        className="text-sm font-medium text-brand-900 transition-colors hover:text-brand-700"
      >
        Favoritos
      </Link>
      <Link
        href="/mensajes"
        className="flex items-center gap-1.5 text-sm font-medium text-brand-900 transition-colors hover:text-brand-700"
      >
        Mensajes
        <ContadorMensajes />
      </Link>
      <Link
        href="/notificaciones"
        className="flex items-center gap-1.5 text-sm font-medium text-brand-900 transition-colors hover:text-brand-700"
      >
        Notificaciones
        <ContadorNotificaciones />
      </Link>
      {user.role === "ADMIN" ? (
        <Link
          href="/admin/reportes"
          className="text-sm font-medium text-brand-900 transition-colors hover:text-brand-700"
        >
          Reportes
        </Link>
      ) : null}
      <Link
        href="/perfil"
        className="text-sm font-medium text-brand-900 transition-colors hover:text-brand-700"
      >
        {user.name}
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="rounded-md border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>
    </div>
  );
}
