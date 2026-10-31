import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageOpen, SlidersHorizontal } from "lucide-react";
import { obtenerCategoriaPorSlug } from "@/lib/categories";
import { obtenerPublicacionesActivas } from "@/lib/listings";
import { derivarRatingVendedor } from "@/lib/perfiles";
import { IconoCategoria } from "@/components/categorias/icono-categoria";
import { obtenerCategoriasNavegacion } from "@/components/layout/categorias-navegacion";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import { urlListados } from "@/components/listing/url-listados";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Contenedor } from "@/components/ui/contenedor";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Migas } from "@/components/ui/migas";
import { Paginacion } from "@/components/ui/paginacion";
import { unirClases } from "@/components/ui/unir-clases";

export const dynamic = "force-dynamic";

type CategoriaPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pagina?: string | string[] }>;
};

// Deduplica la consulta entre generateMetadata y la página.
const obtenerCategoria = cache(obtenerCategoriaPorSlug);

export async function generateMetadata({ params }: CategoriaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categoria = await obtenerCategoria(slug);
  if (!categoria) {
    return { title: "Categoría no encontrada — Don Segundo" };
  }
  return {
    title: `${categoria.name} — Don Segundo`,
    description: `Publicaciones de ${categoria.name.toLowerCase()} en venta en el campo argentino.`,
  };
}

function leerPagina(valor: string | string[] | undefined): number {
  const numero = typeof valor === "string" ? Number.parseInt(valor, 10) : 1;
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}

/**
 * Página de categoría (RF-12/RNF-12): migas, accesos a subcategorías (chips
 * con scroll horizontal en mobile) y las publicaciones activas de la
 * categoría, incluidas las de sus subcategorías, con paginación. Para
 * combinar más filtros deriva al listado con la categoría aplicada.
 */
export default async function CategoriaPage({ params, searchParams }: CategoriaPageProps) {
  const [{ slug }, { pagina }] = await Promise.all([params, searchParams]);
  const categoria = await obtenerCategoria(slug);

  if (!categoria) {
    notFound();
  }

  const [resultado, categorias] = await Promise.all([
    obtenerPublicacionesActivas({ categoria: categoria.id, pagina: leerPagina(pagina) }),
    obtenerCategoriasNavegacion(),
  ]);

  // Una subcategoría muestra a sus hermanas; una raíz, a sus hijas.
  const padre = categorias.find((raiz) => raiz.children.some((hija) => hija.id === categoria.id));
  const raiz = padre ?? categoria;
  const subcategorias = padre ? padre.children : categoria.children;
  const textoTotal = `${resultado.total.toLocaleString("es-AR")} ${
    resultado.total === 1 ? "publicación" : "publicaciones"
  }`;

  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <Migas
        items={[
          { etiqueta: "Inicio", href: "/" },
          ...(padre ? [{ etiqueta: padre.name, href: `/categorias/${padre.slug}` }] : []),
          { etiqueta: categoria.name },
        ]}
      />

      <header className="mt-3 flex items-center gap-3 sm:mt-4 sm:gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 sm:size-14">
          <IconoCategoria slug={raiz.slug} className="size-6 sm:size-7" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-marca text-2xl font-medium text-tinta sm:text-4xl">
            {categoria.name}
          </h1>
          <p className="text-sm text-tinta-tenue">{textoTotal}</p>
        </div>
      </header>

      {subcategorias.length > 0 ? (
        <nav aria-label="Subcategorías" className="mt-5">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <li className="shrink-0">
              <Link
                href={`/categorias/${raiz.slug}`}
                aria-current={!padre ? "page" : undefined}
                className={unirClases(
                  "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium",
                  !padre
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-linea-fuerte bg-superficie text-tinta-suave hover:border-brand-300",
                )}
              >
                Todo {raiz.name.toLowerCase()}
              </Link>
            </li>
            {subcategorias.map((subcategoria) => {
              const actual = subcategoria.id === categoria.id;
              return (
                <li key={subcategoria.id} className="shrink-0">
                  <Link
                    href={`/categorias/${subcategoria.slug}`}
                    aria-current={actual ? "page" : undefined}
                    className={unirClases(
                      "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium",
                      actual
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-linea-fuerte bg-superficie text-tinta-suave hover:border-brand-300",
                    )}
                  >
                    {subcategoria.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-tinta">Publicaciones</h2>
        <BotonEnlace
          href={urlListados({ categoria: categoria.id })}
          variante="secundario"
          tamanio="sm"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filtrar y ordenar
        </BotonEnlace>
      </div>

      {resultado.publicaciones.length > 0 ? (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {resultado.publicaciones.map((publicacion, indice) => (
              <li key={publicacion.id} className="grid">
                <TarjetaPublicacion
                  publicacion={publicacion}
                  sellerVerified={publicacion.owner?.profile?.sellerVerified ?? null}
                  rating={derivarRatingVendedor(publicacion.owner?.profile)}
                  prioridad={indice < 2}
                />
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Paginacion
              paginaActual={resultado.pagina}
              totalPaginas={resultado.totalPaginas}
              hrefPagina={(numero) =>
                numero === 1 ? `/categorias/${categoria.slug}` : `/categorias/${categoria.slug}?pagina=${numero}`
              }
            />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <EstadoVacio
            icono={PackageOpen}
            titulo="Todavía no hay publicaciones acá"
            descripcion={`Sé el primero en publicar en ${categoria.name.toLowerCase()}.`}
            accion={
              <div className="flex flex-col gap-2 sm:flex-row">
                <BotonEnlace href="/listados" variante="secundario">
                  Ver otras publicaciones
                </BotonEnlace>
                <BotonEnlace href="/publicar" variante="acento">
                  Publicar
                </BotonEnlace>
              </div>
            }
          />
        </div>
      )}
    </Contenedor>
  );
}
