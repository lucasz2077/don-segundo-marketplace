"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

type NavActionsProps = {
  user: {
    name: string;
    email: string;
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
        href="/dashboard"
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
