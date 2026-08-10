"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const claseCampo =
  "w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

const etiquetaCampo = "mb-1 block text-sm font-medium text-brand-700";

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
        <p className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {exito ? (
        <p className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
          {exito}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? "Actualizando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}