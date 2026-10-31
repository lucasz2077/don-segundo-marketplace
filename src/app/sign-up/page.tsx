"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { signUpSchema } from "@/lib/validation/auth";
import { EntradaContrasena } from "@/components/auth/entrada-contrasena";
import { mensajeErrorAuth } from "@/components/auth/mensajes-error-auth";
import { PanelAutenticacion } from "@/components/auth/panel-autenticacion";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada } from "@/components/ui/campo";

/**
 * Registro con nombre, email y contraseña (Better Auth). Valida con Zod antes
 * de enviar (incluida la confirmación de contraseña) y traduce los errores
 * del servidor.
 */
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
      setError(parsed.error.issues[0]?.message ?? "Revisá los datos ingresados.");
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
        setError(mensajeErrorAuth(signUpError, "No pudimos crear tu cuenta. Intentá de nuevo."));
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

  return (
    <PanelAutenticacion
      titulo="Creá tu cuenta"
      descripcion="Es gratis. Con una sola cuenta podés comprar y vender."
      pie={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
            Ingresá
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Campo id="name" etiqueta="Nombre y apellido">
          <Entrada
            id="name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Campo>
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
        <Campo id="password" etiqueta="Contraseña" ayuda="Al menos 8 caracteres.">
          <EntradaContrasena
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-ayuda"
            required
          />
        </Campo>
        <Campo id="confirmPassword" etiqueta="Repetí la contraseña">
          <EntradaContrasena
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Campo>

        {error ? <Alerta tono="peligro">{error}</Alerta> : null}

        <Boton type="submit" variante="acento" tamanio="lg" anchoCompleto cargando={loading}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Boton>
      </form>
    </PanelAutenticacion>
  );
}
