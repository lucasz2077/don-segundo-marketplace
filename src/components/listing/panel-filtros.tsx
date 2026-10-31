import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { IconoCategoria } from "@/components/categorias/icono-categoria";
import type { CategoriaNavegacion } from "@/components/layout/tipos";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada, Selector } from "@/components/ui/campo";
import { unirClases } from "@/components/ui/unir-clases";
import { urlListados, type FiltrosListado } from "./url-listados";

type PanelFiltrosProps = {
  filtros: FiltrosListado;
  categorias: CategoriaNavegacion[];
  provincias: readonly string[];
  /** Sufijo para ids únicos: el panel se renderiza en el sidebar y en el diálogo mobile. */
  idPanel: string;
};

const claseOpcion =
  "flex min-h-10 items-center gap-2 rounded-control px-2 text-sm text-tinta-suave hover:bg-brand-50 hover:text-tinta";

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-b border-linea py-4 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="mb-2 text-sm font-semibold text-tinta">{titulo}</h3>
      {children}
    </section>
  );
}

/**
 * Filtros del listado (RF-15): categoría y condición como enlaces (un toque
 * aplica el filtro, ideal en mobile) y ubicación + rango de precio como un
 * formulario GET que conserva el resto de los filtros. Server Component: se
 * reutiliza en el sidebar de desktop y dentro del diálogo de mobile.
 */
export function PanelFiltros({ filtros, categorias, provincias, idPanel }: PanelFiltrosProps) {
  const raizSeleccionada = categorias.find(
    (categoria) =>
      categoria.id === filtros.categoria ||
      categoria.children.some((hija) => hija.id === filtros.categoria),
  );

  return (
    <div>
      <Grupo titulo="Categoría">
        {raizSeleccionada ? (
          <ul className="space-y-0.5">
            <li>
              <Link href={urlListados(filtros, { categoria: null })} className={claseOpcion}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                Todas las categorías
              </Link>
            </li>
            <li>
              <Link
                href={urlListados(filtros, { categoria: raizSeleccionada.id })}
                aria-current={raizSeleccionada.id === filtros.categoria ? "true" : undefined}
                className={unirClases(
                  claseOpcion,
                  raizSeleccionada.id === filtros.categoria && "font-semibold text-tinta",
                )}
              >
                {raizSeleccionada.name}
              </Link>
            </li>
            {raizSeleccionada.children.map((hija) => (
              <li key={hija.id}>
                <Link
                  href={urlListados(filtros, { categoria: hija.id })}
                  aria-current={hija.id === filtros.categoria ? "true" : undefined}
                  className={unirClases(
                    claseOpcion,
                    "pl-6",
                    hija.id === filtros.categoria && "bg-brand-50 font-semibold text-tinta",
                  )}
                >
                  {hija.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-0.5">
            {categorias.map((categoria) => {
              return (
                <li key={categoria.id}>
                  <Link href={urlListados(filtros, { categoria: categoria.id })} className={claseOpcion}>
                    <IconoCategoria slug={categoria.slug} className="size-4 text-tinta-tenue" />
                    {categoria.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Grupo>

      <Grupo titulo="Condición">
        <div className="flex gap-2">
          {(
            [
              ["NEW", "Nuevo"],
              ["USED", "Usado"],
            ] as const
          ).map(([valor, etiqueta]) => {
            const activa = filtros.condicion === valor;
            return (
              <Link
                key={valor}
                href={urlListados(filtros, { condicion: activa ? null : valor })}
                aria-current={activa ? "true" : undefined}
                className={unirClases(
                  "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium",
                  activa
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-linea-fuerte bg-superficie text-tinta-suave hover:border-brand-300",
                )}
              >
                {activa ? <Check className="size-4" aria-hidden="true" /> : null}
                {etiqueta}
              </Link>
            );
          })}
        </div>
      </Grupo>

      <Grupo titulo="Ubicación y precio">
        <form action="/listados" method="GET" className="flex flex-col gap-3">
          {filtros.q ? <input type="hidden" name="q" value={filtros.q} /> : null}
          {filtros.categoria ? (
            <input type="hidden" name="categoria" value={filtros.categoria} />
          ) : null}
          {filtros.condicion ? (
            <input type="hidden" name="condicion" value={filtros.condicion} />
          ) : null}
          {filtros.orden && filtros.orden !== "recientes" ? (
            <input type="hidden" name="orden" value={filtros.orden} />
          ) : null}
          <Campo id={`provincia-${idPanel}`} etiqueta="Provincia">
            <Selector
              id={`provincia-${idPanel}`}
              name="provincia"
              defaultValue={filtros.provincia ?? ""}
            >
              <option value="">Todas las provincias</option>
              {provincias.map((provincia) => (
                <option key={provincia} value={provincia}>
                  {provincia}
                </option>
              ))}
            </Selector>
          </Campo>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-tinta">Precio</legend>
            <div className="flex items-center gap-2">
              <label htmlFor={`min-${idPanel}`} className="sr-only">
                Precio mínimo
              </label>
              <Entrada
                id={`min-${idPanel}`}
                name="minPrecio"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Mínimo"
                defaultValue={filtros.minPrecio}
              />
              <span className="text-tinta-tenue" aria-hidden="true">
                –
              </span>
              <label htmlFor={`max-${idPanel}`} className="sr-only">
                Precio máximo
              </label>
              <Entrada
                id={`max-${idPanel}`}
                name="maxPrecio"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Máximo"
                defaultValue={filtros.maxPrecio}
              />
            </div>
          </fieldset>
          <Boton type="submit" variante="secundario" anchoCompleto>
            Aplicar
          </Boton>
        </form>
      </Grupo>
    </div>
  );
}
