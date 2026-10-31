"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/validation/auth";
import { EntradaContrasena } from "@/components/auth/entrada-contrasena";
import { mensajeErrorAuth } from "@/components/auth/mensajes-error-auth";
import { PanelAutenticacion } from "@/components/auth/panel-autenticacion";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada } from "@/components/ui/campo";

/**
 * Ingreso con email y contraseña (Better Auth). Valida con Zod antes de
 * enviar, traduce los errores del servidor y vuelve a la ruta de origen
 * (`?redirect=`) o al listado.
 */
export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/listados";

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

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PanelAutenticacion
      titulo="Ingresá a tu cuenta"
      descripcion="Comprá, vendé y seguí tus publicaciones del campo."
      pie={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/sign-up" className="font-semibold text-brand-700 hover:underline">
            Creá una gratis
          </Link>
        </>
      }
    >
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

        {error ? <Alerta tono="peligro">{error}</Alerta> : null}

        <Boton type="submit" tamanio="lg" anchoCompleto cargando={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </Boton>
      </form>
    </PanelAutenticacion>
  );
}
