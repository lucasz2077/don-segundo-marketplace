"use client";

import { useState } from "react";
import { BotonEliminarDireccion } from "@/components/perfil/boton-eliminar-direccion";
import { FormularioDireccion } from "@/components/perfil/formulario-direccion";
import { clasesBoton } from "@/components/ui/boton";

type DireccionClient = {
  id: string;
  calle: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  pisoDepto: string | null;
  referencia: string | null;
  esPredeterminada: boolean;
};

type GestionDireccionesProps = {
  direcciones: DireccionClient[];
};

/**
 * Gestión de direcciones del usuario: lista como cards, formulario de alta,
 * edición y eliminación. Todo el estado de la UI (qué formulario está abierto)
 * vive acá; los datos llegan desde el server component por props.
 */
export function GestionDirecciones({ direcciones }: GestionDireccionesProps) {
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function cerrarFormularios() {
    setCreando(false);
    setEditandoId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-tinta">Tus direcciones</h2>
        {!creando ? (
          <button
            type="button"
            onClick={() => {
              cerrarFormularios();
              setCreando(true);
            }}
            className={clasesBoton()}
          >
            Nueva dirección
          </button>
        ) : null}
      </div>

      {creando ? (
        <FormularioDireccion
          key="nueva"
          onCancelar={cerrarFormularios}
          onGuardado={cerrarFormularios}
        />
      ) : null}

      {direcciones.length === 0 && !creando ? (
        <div className="rounded-card border border-linea bg-superficie p-8 shadow-card text-center">
          <p className="text-brand-900">
            Todavía no tenés direcciones guardadas.
          </p>
          <p className="mt-1 text-sm text-brand-600">
            Agregá una dirección para agilizar tus compras y entregas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {direcciones.map((direccion) =>
            editandoId === direccion.id ? (
              <FormularioDireccion
                key={direccion.id}
                direccion={direccion}
                onCancelar={cerrarFormularios}
                onGuardado={cerrarFormularios}
              />
            ) : (
              <div
                key={direccion.id}
                className="flex flex-col justify-between rounded-card border border-linea bg-superficie p-5 shadow-card"
              >
                <div>
                  {direccion.esPredeterminada ? (
                    <span className="mb-2 inline-block rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-brand-900">
                      Predeterminada
                    </span>
                  ) : null}
                  <p className="font-semibold text-brand-900">{direccion.calle}</p>
                  <p className="mt-1 text-sm text-brand-600">
                    {direccion.ciudad}, {direccion.provincia}
                  </p>
                  <p className="text-sm text-brand-600">
                    CP {direccion.codigoPostal}
                  </p>
                  {direccion.pisoDepto ? (
                    <p className="mt-1 text-sm text-brand-600">
                      Piso/Depto: {direccion.pisoDepto}
                    </p>
                  ) : null}
                  {direccion.referencia ? (
                    <p className="mt-1 text-sm text-brand-600">
                      Referencia: {direccion.referencia}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreando(false);
                      setEditandoId(direccion.id);
                    }}
                    className={clasesBoton({ variante: "secundario", tamanio: "sm" })}
                  >
                    Editar
                  </button>
                  <BotonEliminarDireccion direccionId={direccion.id} />
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}