"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { clasesBoton } from "@/components/ui/boton";
import { clasesControl } from "@/components/ui/campo";

const claseCampo = `min-h-11 ${clasesControl()}`;

const etiquetaCampo = "mb-1.5 block text-sm font-medium text-tinta";

/**
 * Formulario de cambio de contraseña. Usa authClient.changePassword y pide
 * re-emitir las demás sesiones al cambiarla.
 */
export function FormularioContrasena() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setExito(null);

    if (nueva.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nueva !== confirmacion) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      const { error: changeError } = await authClient.changePassword({
        currentPassword: actual,
        newPassword: nueva,
        revokeOtherSessions: true,
      });

      if (changeError) {
        setError(
          changeError.message ??
            "No se pudo cambiar la contraseña. Revisá la contraseña actual."
        );
        setEnviando(false);
        return;
      }

      setExito("Contraseña actualizada correctamente.");
      setActual("");
      setNueva("");
      setConfirmacion("");
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-4">
      <div>
        <label htmlFor="actual" className={etiquetaCampo}>
          Contraseña actual
        </label>
        <input
          id="actual"
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(evento) => setActual(evento.target.value)}
          className={claseCampo}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nueva" className={etiquetaCampo}>
            Nueva contraseña
          </label>
          <input
            id="nueva"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(evento) => setNueva(evento.target.value)}
            className={claseCampo}
            required
          />
        </div>
        <div>
          <label htmlFor="confirmacion" className={etiquetaCampo}>
            Confirmar nueva contraseña
          </label>
          <input
            id="confirmacion"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
            className={claseCampo}
            required
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {exito ? (
        <p className="rounded-control border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          {exito}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className={clasesBoton()}
      >
        {enviando ? "Actualizando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}