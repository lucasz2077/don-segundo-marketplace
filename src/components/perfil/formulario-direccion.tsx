"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";
import { direccionSchema } from "@/lib/validation/direccion";

type DireccionFormulario = {
  id: string;
  calle: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  pisoDepto: string | null;
  referencia: string | null;
  esPredeterminada: boolean;
};

type FormularioDireccionProps = {
  // Sin `direccion` el formulario crea una nueva; con él, edita.
  direccion?: DireccionFormulario;
  onCancelar: () => void;
  onGuardado: () => void;
};

const claseCampo =
  "w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

const etiquetaCampo = "mb-1 block text-sm font-medium text-brand-700";

/**
 * Formulario de dirección reutilizable: crea (POST /api/direcciones) o edita
 * (PATCH /api/direcciones/[id]), valida con Zod y muestra feedback en español.
 */
export function FormularioDireccion({
  direccion,
  onCancelar,
  onGuardado,
}: FormularioDireccionProps) {
  const router = useRouter();
  const esEdicion = Boolean(direccion);

  const [calle, setCalle] = useState(direccion?.calle ?? "");
  const [ciudad, setCiudad] = useState(direccion?.ciudad ?? "");
  const [provincia, setProvincia] = useState(direccion?.provincia ?? "");
  const [codigoPostal, setCodigoPostal] = useState(direccion?.codigoPostal ?? "");
  const [pisoDepto, setPisoDepto] = useState(direccion?.pisoDepto ?? "");
  const [referencia, setReferencia] = useState(direccion?.referencia ?? "");
  const [predeterminada, setPredeterminada] = useState(
    direccion?.esPredeterminada ?? false
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    const parseado = direccionSchema.safeParse({
      calle,
      ciudad,
      provincia,
      codigoPostal,
      pisoDepto: pisoDepto || undefined,
      referencia: referencia || undefined,
      esPredeterminada: predeterminada,
    });

    if (!parseado.success) {
      setError(parseado.error.issues[0]?.message ?? "Revisa los datos de la dirección");
      return;
    }

    setEnviando(true);
    try {
      const ruta = esEdicion
        ? `/api/direcciones/${direccion?.id}`
        : "/api/direcciones";
      const respuesta = await fetch(ruta, {
        method: esEdicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseado.data),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        setError(
          cuerpo?.error?.message ?? "No se pudo guardar la dirección. Intenta de nuevo."
        );
        setEnviando(false);
        return;
      }
      router.refresh();
      onGuardado();
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={manejarEnvio}
      className="rounded-lg border border-brand-100 bg-white p-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="calle" className={etiquetaCampo}>
            Calle y número
          </label>
          <input
            id="calle"
            type="text"
            value={calle}
            onChange={(evento) => setCalle(evento.target.value)}
            placeholder="Ej.: Av. Siempre Viva 742"
            className={claseCampo}
            required
          />
        </div>
        <div>
          <label htmlFor="ciudad" className={etiquetaCampo}>
            Ciudad
          </label>
          <input
            id="ciudad"
            type="text"
            value={ciudad}
            onChange={(evento) => setCiudad(evento.target.value)}
            className={claseCampo}
            required
          />
        </div>
        <div>
          <label htmlFor="provincia" className={etiquetaCampo}>
            Provincia
          </label>
          <select
            id="provincia"
            value={provincia}
            onChange={(evento) => setProvincia(evento.target.value)}
            className={claseCampo}
            required
          >
            <option value="">Selecciona una provincia</option>
            {PROVINCIAS_ARGENTINA.map((provinciaDisponible) => (
              <option key={provinciaDisponible} value={provinciaDisponible}>
                {provinciaDisponible}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="codigoPostal" className={etiquetaCampo}>
            Código postal
          </label>
          <input
            id="codigoPostal"
            type="text"
            value={codigoPostal}
            onChange={(evento) => setCodigoPostal(evento.target.value)}
            className={claseCampo}
            required
          />
        </div>
        <div>
          <label htmlFor="pisoDepto" className={etiquetaCampo}>
            Piso / Depto{" "}
            <span className="font-normal text-brand-600">(opcional)</span>
          </label>
          <input
            id="pisoDepto"
            type="text"
            value={pisoDepto}
            onChange={(evento) => setPisoDepto(evento.target.value)}
            className={claseCampo}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="referencia" className={etiquetaCampo}>
            Referencia{" "}
            <span className="font-normal text-brand-600">(opcional)</span>
          </label>
          <input
            id="referencia"
            type="text"
            value={referencia}
            onChange={(evento) => setReferencia(evento.target.value)}
            placeholder="Ej.: casa blanca con portón verde"
            className={claseCampo}
          />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-brand-900">
        <input
          type="checkbox"
          checked={predeterminada}
          onChange={(evento) => setPredeterminada(evento.target.checked)}
          className="rounded border-brand-300"
        />
        Usar como dirección predeterminada
      </label>

      {error ? (
        <p className="mt-3 rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando
            ? esEdicion
              ? "Guardando..."
              : "Guardando dirección..."
            : esEdicion
              ? "Guardar cambios"
              : "Guardar dirección"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}