"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { recuperarContraseniaSchema } from "@/lib/validation/auth";
import { mensajeErrorAuth } from "@/components/auth/mensajes-error-auth";
import { Alerta } from "@/components/ui/alerta";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada } from "@/components/ui/campo";

/**
 * Pedido de recuperación de contraseña (RF-03). Siempre muestra el mismo
 * mensaje de éxito, exista o no la cuenta, para no revelar qué emails están
 * registrados.
 */
export function FormularioRecuperarContrasenia() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = recuperarContraseniaSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ingresá un email válido.");
      return;
    }

    setLoading(true);
    try {
      const { error: errorPedido } = await authClient.requestPasswordReset({
        email: parsed.data.email,
        redirectTo: "/restablecer-contrasenia",
      });
      if (errorPedido) {
        setError(mensajeErrorAuth(errorPedido, "No pudimos procesar el pedido. Intentá de nuevo."));
        return;
      }
      setEnviado(true);
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <Alerta tono="exito" titulo="Revisá tu correo">
        Si {email.trim()} tiene una cuenta en Don Segundo, te mandamos un enlace para elegir una
        contraseña nueva. Vence en 1 hora. Si no lo ves, buscá en la carpeta de spam.
      </Alerta>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Campo id="email" etiqueta="Email de tu cuenta">
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

      {error ? <Alerta tono="peligro">{error}</Alerta> : null}

      <Boton type="submit" tamanio="lg" anchoCompleto cargando={loading}>
        {loading ? "Enviando..." : "Enviarme el enlace"}
      </Boton>
    </form>
  );
}
