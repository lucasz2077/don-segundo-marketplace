import Link from "next/link";
import { busquedaSchema, type BusquedaInput } from "@/lib/validation/listing";
import { obtenerPublicacionesActivas } from "@/lib/listings";
import { obtenerCategoriasRaiz } from "@/lib/categories";
import { derivarRatingVendedor } from "@/lib/perfiles";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import { FiltrosBusqueda } from "@/components/listing/filtros-busqueda";

export const dynamic = "force-dynamic";

type ListadosPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function leerTexto(valor: string | string[] | undefined): string | undefined {
  if (typeof valor !== "string") {
    return undefined;
  }
  const limpio = valor.trim();
  return limpio || undefined;
}

function construirUrl(filtros: Record<string, string | number | undefined>): string {
  const url = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && String(valor) !== "") {
      url.set(clave, String(valor));
    }
  }
  const consulta = url.toString();
  return consulta ? `/listados?${consulta}` : "/listados";
}

export default async function ListadosPage({ searchParams }: ListadosPageProps) {
  const params = await searchParams;
  const parseado = busquedaSchema.safeParse({
    q: leerTexto(params.q),
    categoria: leerTexto(params.categoria),
    provincia: leerTexto(params.provincia),
    minPrecio: leerTexto(params.minPrecio),
    maxPrecio: leerTexto(params.maxPrecio),
    orden: leerTexto(params.orden),
    pagina: leerTexto(params.pagina),
  });

  const filtros: BusquedaInput = parseado.success
    ? parseado.data
    : { orden: "recientes" };

  const [resultado, categorias] = await Promise.all([
    obtenerPublicacionesActivas({
      busqueda: filtros.q,
      categoria: filtros.categoria,
      provincia: filtros.provincia,
      minPrecio: filtros.minPrecio,
      maxPrecio: filtros.maxPrecio,
      orden: filtros.orden,
      pagina: filtros.pagina,
    }),
    obtenerCategoriasRaiz(),
  ]);

  const categoriasPlanas = categorias.flatMap((categoria) => [
    { id: categoria.id, name: categoria.name, slug: categoria.slug },
    ...categoria.children.map((hija) => ({
      id: hija.id,
      name: hija.name,
      slug: hija.slug,
    })),
  ]);

  const filtrosBase = {
    q: filtros.q,
    categoria: filtros.categoria,
    provincia: filtros.provincia,
    minPrecio: filtros.minPrecio,
    maxPrecio: filtros.maxPrecio,
    orden: filtros.orden,
  };
  const tieneAnterior = resultado.pagina > 1;
  const tieneSiguiente = resultado.pagina < resultado.totalPaginas;
  const urlAnterior = construirUrl({ ...filtrosBase, pagina: resultado.pagina - 1 });
  const urlSiguiente = construirUrl({ ...filtrosBase, pagina: resultado.pagina + 1 });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-900 dark:text-bone">
        Publicaciones
      </h1>
      <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
        Explorá y buscá entre las publicaciones activas del campo argentino.
      </p>

      <div className="mt-6">
        <FiltrosBusqueda
          busquedaActual={filtros.q ?? ""}
          categoriaActual={filtros.categoria ?? ""}
          provinciaActual={filtros.provincia ?? ""}
          ordenActual={filtros.orden}
          categorias={categoriasPlanas}
          provincias={PROVINCIAS_ARGENTINA}
        />
      </div>

      {resultado.publicaciones.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-brand-600 dark:text-brand-200">
            {resultado.total} {resultado.total === 1 ? "publicación" : "publicaciones"}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resultado.publicaciones.map((publicacion) => (
              <TarjetaPublicacion
                key={publicacion.id}
                publicacion={publicacion}
                sellerVerified={publicacion.owner?.profile?.sellerVerified ?? null}
                rating={derivarRatingVendedor(publicacion.owner?.profile)}
              />
            ))}
          </div>
          <nav className="mt-8 flex items-center justify-between">
            {tieneAnterior ? (
              <Link
                href={urlAnterior}
                className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                Anterior
              </Link>
            ) : (
              <span className="rounded-md border border-brand-100 px-4 py-2 text-sm font-medium text-brand-400">
                Anterior
              </span>
            )}
            <span className="text-sm text-brand-600 dark:text-brand-200">
              Página {resultado.pagina} de {resultado.totalPaginas}
            </span>
            {tieneSiguiente ? (
              <Link
                href={urlSiguiente}
                className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                Siguiente
              </Link>
            ) : (
              <span className="rounded-md border border-brand-100 px-4 py-2 text-sm font-medium text-brand-400">
                Siguiente
              </span>
            )}
          </nav>
        </>
      ) : (
        <div className="mt-10 rounded-lg border border-brand-100 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-brand-900">
            No encontramos publicaciones
          </h2>
          <p className="mt-2 text-sm text-brand-600">
            Probá con otros filtros o sé el primero en publicar en tu zona.
          </p>
          <Link
            href="/publicar"
            className="mt-6 inline-block rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-400"
          >
            Publicar
          </Link>
        </div>
      )}
    </main>
  );
}
