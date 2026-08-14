"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormularioPerfilPublicoProps = {
  /** Bio actual del perfil, o null si el Profile aún no existe (lazy upsert). */
  bio: string | null;
  /** Nombre comercial actual, o null si el Profile aún no existe. */
  businessName: string | null;
};

const claseCampo =
  "w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

const etiquetaCampo = "mb-1 block text-sm font-medium text-brand-700";

/**
 * Formulario de edición del perfil público propio (bio y businessName).
 * Guarda vía PATCH /api/perfil con lazy upsert: la API crea el Profile en el
 * primer guardado y lo actualiza después (REQ-9). Los campos vacíos se envían
 * como null (el schema los normaliza). Muestra estados de carga, error y
 * éxito, y refresca los datos server al guardar.
 */
export function FormularioPerfilPublico({
  bio,
  businessName,
}: FormularioPerfilPublicoProps) {
  const router = useRouter();

  const [formBio, setFormBio] = useState(bio ?? "");
  const [formBusinessName, setFormBusinessName] = useState(businessName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setExito(null);

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: formBio.trim() || null,
          businessName: formBusinessName.trim() || null,
        }),
      });

      const cuerpo = (await respuesta.json()) as {
        error?: { message?: string };
      };

      if (!respuesta.ok) {
        setError(
          cuerpo.error?.message ??
            "No se pudo guardar el perfil. Revisá los datos e intentá de nuevo."
        );
        return;
      }

      setExito("Perfil público guardado correctamente.");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-4">
      <div>
        <label htmlFor="bio" className={etiquetaCampo}>
          Bio{" "}
          <span className="font-normal text-brand-600">
            (opcional, hasta 500 caracteres)
          </span>
        </label>
        <textarea
          id="bio"
          value={formBio}
          onChange={(evento) => setFormBio(evento.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Contale a los compradores sobre tu campo, tus productos o tu experiencia."
          className={claseCampo}
        />
      </div>

      <div>
        <label htmlFor="businessName" className={etiquetaCampo}>
          Nombre comercial{" "}
          <span className="font-normal text-brand-600">
            (opcional, hasta 80 caracteres)
          </span>
        </label>
        <input
          id="businessName"
          type="text"
          value={formBusinessName}
          onChange={(evento) => setFormBusinessName(evento.target.value)}
          maxLength={80}
          placeholder="Ej.: Agro Juan"
          className={claseCampo}
        />
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
        {enviando ? "Guardando..." : "Guardar perfil"}
      </button>
    </form>
  );
}
