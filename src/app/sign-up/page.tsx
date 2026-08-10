"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { signUpSchema } from "@/lib/validation/auth";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = signUpSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Entrada no válida");
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await authClient.signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (signUpError) {
        setError(signUpError.message ?? "No se pudo crear la cuenta");
        return;
      }

      router.push("/listados");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

  return (
    <main className="flex flex-1 items-center justify-center bg-bone px-4">
      <div className="w-full max-w-sm rounded-lg border border-brand-100 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">
          Crea tu cuenta
        </h1>
        <p className="mb-6 text-sm text-brand-600">
          Unite a Don Segundo, el marketplace del campo
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-brand-700"
            >
              Nombre
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-brand-700"
            >
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
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-brand-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-brand-700"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-600">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-brand-700 underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
