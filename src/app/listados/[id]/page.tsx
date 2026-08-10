import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerPublicacionPorId } from "@/lib/listings";
import { getSession } from "@/lib/auth/session";
import { formatearPrecio } from "@/lib/formato";
import { GaleriaImagenes } from "@/components/listing/galeria-imagenes";
import { BotonEliminarPublicacion } from "@/components/listing/boton-eliminar-publicacion";
import { BotonContactar } from "@/components/listing/boton-contactar";
import { BotonReportar } from "@/components/listing/boton-reportar";
import { esFavorito } from "@/lib/favoritos";

export const dynamic = "force-dynamic";

type DetallePublicacionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DetallePublicacionPage({
  params,
}: DetallePublicacionPageProps) {
  const { id } = await params;

  const session = await getSession();
  const publicacion = await obtenerPublicacionPorId(id, session?.user.id);

  if (!publicacion) {
    notFound();
  }

  const esDueno = session?.user.id === publicacion.ownerId;
  const esAdmin = session?.user.role === "ADMIN";
  // Una publicación pausada o rechazada solo es visible para su dueño o un
  // administrador; el resto recibe 404 (RF-13 / CA-07).
  if (publicacion.status !== "ACTIVE" && !esDueno && !esAdmin) {
    notFound();
  }
  const favoritoInicial = session
    ? await esFavorito(session.user.id, publicacion.id)
    : false;
  const etiquetaCondicion =
    publicacion.condition === "NEW" ? "Nuevo" : "Usado";
  const ubicacion = publicacion.city
    ? `${publicacion.city}, ${publicacion.province}`
    : publicacion.province;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link
        href="/listados"
        className="text-sm font-medium text-brand-700 underline dark:text-brand-200"
      >
        Volver al listado
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <GaleriaImagenes
          imagenes={publicacion.images}
          titulo={publicacion.title}
          mostrarFavorito={Boolean(session) && !esDueno}
          listingId={publicacion.id}
          inicialFavorito={favoritoInicial}
        />

        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
              {etiquetaCondicion}
            </span>
            {publicacion.status === "PAUSED" && (esDueno || esAdmin) ? (
              <span className="rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-brand-900">
                Publicación pausada
              </span>
            ) : null}
            <Link
              href={`/categorias/${publicacion.category.slug}`}
              className="text-sm font-medium text-brand-700 underline"
            >
              {publicacion.category.name}
            </Link>
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-brand-900 dark:text-bone">
            {publicacion.title}
          </h1>
          <p className="mt-2 text-2xl font-semibold text-brand-900 dark:text-bone">
            {formatearPrecio(publicacion.price, publicacion.currency)}
          </p>
          <p className="mt-2 text-sm text-brand-600 dark:text-brand-200">{ubicacion}</p>

          <div className="mt-6 rounded-lg border border-brand-100 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-900">
              Descripción
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-brand-900">
              {publicacion.description}
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-brand-100 bg-white p-4">
            <p className="text-sm text-brand-600">Vendedor</p>
            <p className="text-lg font-semibold text-brand-900">
              {publicacion.owner.name}
            </p>
            {!esDueno ? (
              <BotonContactar
                listingId={publicacion.id}
                sesionIniciada={Boolean(session)}
              />
            ) : null}
          </div>

          {!esDueno ? (
            <div className="mt-4">
              <BotonReportar
                listingId={publicacion.id}
                sesionIniciada={Boolean(session)}
              />
            </div>
          ) : null}

          <p className="mt-4 text-xs text-brand-600 dark:text-brand-200">
            {publicacion.viewCount} {publicacion.viewCount === 1 ? "vista" : "vistas"}
          </p>

          {esDueno ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/publicar?id=${publicacion.id}`}
                className="inline-block rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                Editar
              </Link>
              <BotonEliminarPublicacion listingId={publicacion.id} />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
