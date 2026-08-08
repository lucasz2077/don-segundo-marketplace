"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/validation/auth";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Entrada no válida");
      return;
    }

    setLoading(true);
    const { error: signInError } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message ?? "No se pudo iniciar sesión");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

  return (
    <main className="flex flex-1 items-center justify-center bg-bone px-4">
      <div className="w-full max-w-sm rounded-lg border border-brand-100 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">
          Bienvenido de nuevo
        </h1>
        <p className="mb-6 text-sm text-brand-600">
          Ingresa a tu cuenta de Don Segundo
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-600">
          ¿No tenes cuenta?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-brand-700 underline"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
