"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { destinoSeguro } from "@/lib/auth/destino-seguro";
import { signInSchema } from "@/lib/validation/auth";
import { EntradaContrasena } from "@/components/auth/entrada-contrasena";
import { mensajeErrorAuth } from "@/components/auth/mensajes-error-auth";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada } from "@/components/ui/campo";

/**
 * Formulario de ingreso con email y contraseña (Better Auth). Valida con Zod
 * antes de enviar, traduce los errores del servidor y, al ingresar, navega a
 * `redirectTo`. La página ya lo valida como ruta interna; se revalida acá
 * como segunda barrera contra la redirección abierta.
 */
export function FormularioIngreso({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá los datos ingresados.");
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (signInError) {
        setError(mensajeErrorAuth(signInError, "No pudimos iniciar tu sesión. Intentá de nuevo."));
        return;
      }

      router.push(destinoSeguro(redirectTo));
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Campo id="email" etiqueta="Email">
        <Entrada
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Campo>
      <Campo id="password" etiqueta="Contraseña">
        <EntradaContrasena
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Campo>
      <Link
        href="/recuperar-contrasenia"
        className="-mt-2 self-end text-sm font-medium text-brand-700 hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>

      {error ? <Alerta tono="peligro">{error}</Alerta> : null}

      <Boton type="submit" tamanio="lg" anchoCompleto cargando={loading}>
        {loading ? "Ingresando..." : "Ingresar"}
      </Boton>
    </form>
  );
}
