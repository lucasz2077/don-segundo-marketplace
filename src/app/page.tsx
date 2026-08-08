import Link from "next/link";
import { obtenerCategoriasRaiz } from "@/lib/categories";
import { obtenerPublicacionesRecientes } from "@/lib/listings";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categorias, publicacionesRecientes] = await Promise.all([
    obtenerCategoriasRaiz(),
    obtenerPublicacionesRecientes(6),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero de marca */}
      <section className="bg-brand-900 px-4 py-20 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent-400">
          Marketplace rural
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
          El marketplace del campo argentino
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-brand-100">
          Compra y venta de maquinaria, herramientas, insumos y hacienda entre
          productores de todo el país, directo y sin intermediarios.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/publicar"
            className="w-full rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-400 sm:w-auto"
          >
            Publicar
          </Link>
          <Link
            href="/listados"
            className="w-full rounded-md border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            Explorar
          </Link>
        </div>
      </section>

      {/* Categorías */}
      <section
        id="categorias"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-16"
      >
        <h2 className="mb-8 text-2xl font-semibold text-brand-900">
          Categorías
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map((categoria) => {
            const cantidadSubcategorias = categoria.children.length;
            const textoSubcategorias =
              cantidadSubcategorias === 1
                ? "1 subcategoría"
                : `${cantidadSubcategorias} subcategorías`;

            return (
              <Link
                key={categoria.id}
                href={`/categorias/${categoria.slug}`}
                className="group rounded-lg border border-brand-100 bg-white p-6 transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <h3 className="font-semibold text-brand-900 group-hover:text-brand-700">
                  {categoria.name}
                </h3>
                <p className="mt-1 text-sm text-brand-600">
                  {textoSubcategorias}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Publicaciones recientes */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-brand-900">
            Publicaciones recientes
          </h2>
          <Link
            href="/listados"
            className="text-sm font-medium text-brand-700 underline"
          >
            Ver todas
          </Link>
        </div>
        {publicacionesRecientes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicacionesRecientes.map((publicacion) => (
              <TarjetaPublicacion
                key={publicacion.id}
                publicacion={publicacion}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-brand-100 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-brand-900">
              Sé el primero en publicar
            </p>
            <Link
              href="/publicar"
              className="mt-6 inline-block rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-400"
            >
              Publicar
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
