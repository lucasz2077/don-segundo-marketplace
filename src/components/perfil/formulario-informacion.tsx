"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type FormularioInformacionProps = {
  name: string;
  lastName: string | null;
  dni: string | null;
  accountType: "BUYER" | "SELLER" | "BOTH";
};

const claseCampo =
  "w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

const etiquetaCampo = "mb-1 block text-sm font-medium text-brand-700";

/**
 * Formulario de datos personales y tipo de cuenta. Actualiza vía
 * authClient.updateUser y refresca los datos server del perfil.
 */
export function FormularioInformacion({
  name,
  lastName,
  dni,
  accountType,
}: FormularioInformacionProps) {
  const router = useRouter();

  const [formName, setFormName] = useState(name);
  const [formLastName, setFormLastName] = useState(lastName ?? "");
  const [formDni, setFormDni] = useState(dni ?? "");
  const [formAccountType, setFormAccountType] = useState(accountType);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setExito(null);

    const nombre = formName.trim();
    const apellido = formLastName.trim();
    if (!nombre || !apellido) {
      setError("El nombre y el apellido son obligatorios.");
      return;
    }

    // Normaliza el DNI quitando puntos y guiones (solo dígitos).
    const dniNormalizado = formDni.replace(/\D/g, "");
    if (dniNormalizado && (dniNormalizado.length < 7 || dniNormalizado.length > 8)) {
      setError("El DNI debe tener entre 7 y 8 dígitos.");
      return;
    }

    setEnviando(true);
    try {
      const { error: updateError } = await authClient.updateUser({
        name: nombre,
        lastName: apellido,
        dni: dniNormalizado || null,
        accountType: formAccountType,
      });

      if (updateError) {
        setError(updateError.message ?? "No se pudieron guardar los datos.");
        setEnviando(false);
        return;
      }
      setExito("Datos guardados correctamente.");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nombre" className={etiquetaCampo}>
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            value={formName}
            onChange={(evento) => setFormName(evento.target.value)}
            className={claseCampo}
            required
          />
        </div>
        <div>
          <label htmlFor="apellido" className={etiquetaCampo}>
            Apellido
          </label>
          <input
            id="apellido"
            type="text"
            value={formLastName}
            onChange={(evento) => setFormLastName(evento.target.value)}
            className={claseCampo}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="dni" className={etiquetaCampo}>
          DNI <span className="font-normal text-brand-600">(opcional)</span>
        </label>
        <input
          id="dni"
          type="text"
          inputMode="numeric"
          value={formDni}
          onChange={(evento) => setFormDni(evento.target.value)}
          placeholder="Ej.: 30123456"
          className={claseCampo}
        />
      </div>

      <div>
        <label htmlFor="tipoDeCuenta" className={etiquetaCampo}>
          Tipo de cuenta
        </label>
        <select
          id="tipoDeCuenta"
          value={formAccountType}
          onChange={(evento) =>
            setFormAccountType(evento.target.value as "BUYER" | "SELLER" | "BOTH")
          }
          className={claseCampo}
        >
          <option value="BUYER">Comprador</option>
          <option value="SELLER">Vendedor</option>
          <option value="BOTH">Comprador y vendedor</option>
        </select>
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
        {enviando ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}