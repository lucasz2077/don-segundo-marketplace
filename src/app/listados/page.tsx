import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { busquedaSchema, type BusquedaInput } from "@/lib/validation/listing";
import { obtenerPublicacionesActivas } from "@/lib/listings";
import { derivarRatingVendedor } from "@/lib/perfiles";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";
import { obtenerCategoriasNavegacion } from "@/components/layout/categorias-navegacion";
import { ChipsFiltros, nombreCategoria } from "@/components/listing/chips-filtros";
import { DialogoFiltros } from "@/components/listing/dialogo-filtros";
import { PanelFiltros } from "@/components/listing/panel-filtros";
import { SelectorOrden } from "@/components/listing/selector-orden";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import {
  contarFiltros,
  urlListados,
  type FiltrosListado,
} from "@/components/listing/url-listados";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Contenedor } from "@/components/ui/contenedor";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Migas } from "@/components/ui/migas";
import { Paginacion } from "@/components/ui/paginacion";
import { Tarjeta } from "@/components/ui/tarjeta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publicaciones — Don Segundo",
  description:
    "Maquinaria agrícola, herramientas, insumos, hacienda, repuestos y servicios rurales en venta en todo el país.",
};

type ListadosPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const OPCIONES_ORDEN = [
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "precio-asc", etiqueta: "Menor precio" },
  { valor: "precio-desc", etiqueta: "Mayor precio" },
] as const;

function leerTexto(valor: string | string[] | undefined): string | undefined {
  if (typeof valor !== "string") {
    return undefined;
  }
  const limpio = valor.trim();
  return limpio || undefined;
}

/**
 * Búsqueda y listado de publicaciones activas (RF-14/RF-15), mobile-first:
 * en mobile, barra fija con "Filtrar" (hoja inferior) y orden, chips de
 * filtros y tarjetas horizontales; desde lg, sidebar de filtros y grilla.
 */
export default async function ListadosPage({ searchParams }: ListadosPageProps) {
  const params = await searchParams;
  const parseado = busquedaSchema.safeParse({
    q: leerTexto(params.q),
    categoria: leerTexto(params.categoria),
    condicion: leerTexto(params.condicion),
    provincia: leerTexto(params.provincia),
    minPrecio: leerTexto(params.minPrecio),
    maxPrecio: leerTexto(params.maxPrecio),
    orden: leerTexto(params.orden),
    pagina: leerTexto(params.pagina),
  });

  const entrada: BusquedaInput = parseado.success ? parseado.data : { orden: "recientes" };
  const filtros: FiltrosListado = {
    q: entrada.q || undefined,
    categoria: entrada.categoria,
    condicion: entrada.condicion,
    provincia: entrada.provincia,
    minPrecio: entrada.minPrecio,
    maxPrecio: entrada.maxPrecio,
    orden: entrada.orden,
  };

  const [resultado, categorias] = await Promise.all([
    obtenerPublicacionesActivas({
      busqueda: filtros.q,
      categoria: filtros.categoria,
      condicion: filtros.condicion,
      provincia: filtros.provincia,
      minPrecio: filtros.minPrecio,
      maxPrecio: filtros.maxPrecio,
      orden: filtros.orden,
      pagina: entrada.pagina,
    }),
    obtenerCategoriasNavegacion(),
  ]);

  const categoriaActual = nombreCategoria(categorias, filtros.categoria);
  const titulo = filtros.q
    ? `Resultados para “${filtros.q}”`
    : (categoriaActual ?? "Todas las publicaciones");
  const textoTotal = `${resultado.total.toLocaleString("es-AR")} ${
    resultado.total === 1 ? "resultado" : "resultados"
  }`;
  const opcionesOrden = OPCIONES_ORDEN.map((opcion) => ({
    ...opcion,
    href: urlListados(filtros, { orden: opcion.valor }),
  }));
  const panel = (idPanel: string) => (
    <PanelFiltros
      filtros={filtros}
      categorias={categorias}
      provincias={PROVINCIAS_ARGENTINA}
      idPanel={idPanel}
    />
  );

  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <div className="hidden sm:block">
        <Migas
          items={[
            { etiqueta: "Inicio", href: "/" },
            ...(categoriaActual
              ? [{ etiqueta: "Publicaciones", href: "/listados" }, { etiqueta: categoriaActual }]
              : [{ etiqueta: "Publicaciones" }]),
          ]}
        />
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-4 sm:mt-3">
        <h1 className="min-w-0 truncate text-xl font-semibold text-tinta sm:text-2xl">{titulo}</h1>
        <p className="shrink-0 text-sm text-tinta-tenue lg:hidden">{textoTotal}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <aside aria-label="Filtros" className="hidden lg:block">
          <Tarjeta relleno="sm" className="sticky top-4">
            {/* h2 oculto: los grupos del panel son h3 (h1 → h2 → h3). */}
            <h2 className="sr-only">Filtros</h2>
            <p className="mb-4 text-sm text-tinta-tenue">{textoTotal}</p>
            {panel("sidebar")}
          </Tarjeta>
        </aside>

        <div className="min-w-0 lg:col-span-3">
          {/* Barra de herramientas: fija arriba en mobile para filtrar y
              ordenar sin volver al principio de la lista. */}
          <div className="sticky top-0 z-30 -mx-4 flex items-center gap-2 border-b border-linea bg-fondo/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex flex-1 lg:hidden">
              <DialogoFiltros cantidadFiltros={contarFiltros(filtros)}>
                {panel("dialogo")}
              </DialogoFiltros>
            </div>
            <div className="flex-1 sm:flex-none">
              <SelectorOrden
                id="orden-listado"
                opciones={opcionesOrden}
                valorActual={filtros.orden ?? "recientes"}
              />
            </div>
          </div>

          <div className="mt-3">
            <ChipsFiltros filtros={filtros} categorias={categorias} />
          </div>

          {resultado.publicaciones.length > 0 ? (
            <>
              {/* Mantiene la jerarquía h1 → h2 → h3 (títulos de tarjeta). */}
              <h2 className="sr-only">Resultados</h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {resultado.publicaciones.map((publicacion, indice) => (
                  <li key={publicacion.id} className="grid">
                    <TarjetaPublicacion
                      publicacion={publicacion}
                      sellerVerified={publicacion.owner?.profile?.sellerVerified ?? null}
                      rating={derivarRatingVendedor(publicacion.owner?.profile)}
                      disposicion="adaptable"
                      prioridad={indice < 3}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Paginacion
                  paginaActual={resultado.pagina}
                  totalPaginas={resultado.totalPaginas}
                  hrefPagina={(pagina) => urlListados(filtros, { pagina })}
                />
              </div>
            </>
          ) : (
            <div className="mt-6">
              <EstadoVacio
                icono={SearchX}
                titulo="No encontramos publicaciones"
                descripcion="Probá con otras palabras o sacá algunos filtros. También podés ser el primero en publicar en tu zona."
                accion={
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <BotonEnlace href="/listados" variante="secundario">
                      Ver todas las publicaciones
                    </BotonEnlace>
                    <BotonEnlace href="/publicar" variante="acento">
                      Publicar
                    </BotonEnlace>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>
    </Contenedor>
  );
}
