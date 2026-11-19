"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { restablecerContraseniaSchema } from "@/lib/validation/auth";
import { EntradaContrasena } from "@/components/auth/entrada-contrasena";
import { mensajeErrorAuth } from "@/components/auth/mensajes-error-auth";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Campo } from "@/components/ui/campo";

/** Elección de la contraseña nueva con el token del mail (RF-03). */
export function FormularioRestablecerContrasenia({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = restablecerContraseniaSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá la contraseña.");
      return;
    }

    setLoading(true);
    try {
      const { error: errorCambio } = await authClient.resetPassword({
        newPassword: parsed.data.password,
        token,
      });
      if (errorCambio) {
        setError(
          mensajeErrorAuth(
            errorCambio,
            "El enlace venció o ya se usó. Pedí uno nuevo desde \"¿Olvidaste tu contraseña?\"."
          )
        );
        return;
      }
      setListo(true);
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (listo) {
    return (
      <Alerta
        tono="exito"
        titulo="Listo, cambiaste tu contraseña"
        accion={<BotonEnlace href="/sign-in">Ingresar</BotonEnlace>}
      >
        Por seguridad cerramos las sesiones abiertas en otros dispositivos.
      </Alerta>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Campo id="password" etiqueta="Contraseña nueva" ayuda="Al menos 8 caracteres.">
        <EntradaContrasena
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-ayuda"
          required
        />
      </Campo>
      <Campo id="confirmPassword" etiqueta="Repetí la contraseña nueva">
        <EntradaContrasena
          id="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </Campo>

      {error ? <Alerta tono="peligro">{error}</Alerta> : null}

      <Boton type="submit" tamanio="lg" anchoCompleto cargando={loading}>
        {loading ? "Guardando..." : "Guardar contraseña"}
      </Boton>
    </form>
  );
}
