"use client";

import { useRouter } from "next/navigation";
import { Selector } from "@/components/ui/campo";

type SelectorOrdenProps = {
  /** Opciones con la URL ya armada en el servidor (conserva los filtros). */
  opciones: Array<{ valor: string; etiqueta: string; href: string }>;
  valorActual: string;
  id: string;
};

/** Selector de orden del listado: navega a la URL de la opción elegida. */
export function SelectorOrden({ opciones, valorActual, id }: SelectorOrdenProps) {
  const router = useRouter();

  return (
    <div className="flex w-full items-center gap-2">
      <label htmlFor={id} className="sr-only shrink-0 text-sm text-tinta-tenue sm:not-sr-only">
        Ordenar
      </label>
      <Selector
        id={id}
        value={valorActual}
        onChange={(evento) => {
          const opcion = opciones.find((item) => item.valor === evento.target.value);
          if (opcion) {
            router.push(opcion.href);
          }
        }}
        className="min-w-0 flex-1"
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </Selector>
    </div>
  );
}
