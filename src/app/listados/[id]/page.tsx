import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerPublicacionPorId } from "@/lib/listings";
import { getSession } from "@/lib/auth/session";
import { formatearPrecio } from "@/lib/formato";
import { GaleriaImagenes } from "@/components/listing/galeria-imagenes";
import { BotonComprar } from "@/components/listing/boton-comprar";
import { BotonEliminarPublicacion } from "@/components/listing/boton-eliminar-publicacion";
import { BotonContactar } from "@/components/listing/boton-contactar";
import { BotonReportar } from "@/components/listing/boton-reportar";
import { esFavorito } from "@/lib/favoritos";
import { obtenerResenasDePublicacion } from "@/lib/ratings";
import { BloqueResenasPublicacion } from "@/components/ratings/bloque-resenas-publicacion";

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
  // Se resuelve antes del chequeo de acceso: además de usarse para el estado
  // inicial del favorito, determina si un visitante puede ver una publicación
  // pausada o rechazada (los destinatarios de la notificación de cambio de
  // estado la tienen en favoritos).
  const favoritoInicial = session
    ? await esFavorito(session.user.id, publicacion.id)
    : false;
  // Una publicación pausada o rechazada solo es visible para su dueño, un
  // administrador o un usuario que la tenga en favoritos; el resto recibe 404
  // (RF-13 / CA-07).
  if (
    publicacion.status !== "ACTIVE" &&
    !esDueno &&
    !esAdmin &&
    !favoritoInicial
  ) {
    notFound();
  }
  const etiquetaCondicion =
    publicacion.condition === "NEW" ? "Nuevo" : "Usado";
  const ubicacion = publicacion.city
    ? `${publicacion.city}, ${publicacion.province}`
    : publicacion.province;
  const resenas = await obtenerResenasDePublicacion(id);

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
            {publicacion.status === "PAUSED" ? (
              <span className="rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-brand-900">
                Publicación pausada
              </span>
            ) : publicacion.status === "REJECTED" ? (
              <span className="rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-brand-900">
                Publicación rechazada
              </span>
            ) : publicacion.status === "SOLD" && publicacion.stock === 0 ? (
              <span className="rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-brand-900">
                Publicación vendida
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
          {publicacion.status === "ACTIVE" ? (
            <p className="mt-2 text-sm font-medium text-brand-700 dark:text-brand-200">
              {publicacion.stock === 1
                ? "Última unidad"
                : `Quedan ${publicacion.stock} disponibles`}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-brand-600 dark:text-brand-200">{ubicacion}</p>

          {!esDueno && publicacion.status === "ACTIVE" && publicacion.stock > 0 ? (
            <div className="mt-4">
              <BotonComprar
                listingId={publicacion.id}
                sesionIniciada={Boolean(session)}
              />
            </div>
          ) : null}

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
            <Link
              href={`/vendedores/${publicacion.owner.id}`}
              className="text-lg font-semibold text-brand-900 underline-offset-2 hover:underline"
            >
              {publicacion.owner.name}
            </Link>
            {publicacion.owner.profile?.businessName ? (
              <p className="mt-1 text-sm font-medium text-brand-700">
                {publicacion.owner.profile.businessName}
              </p>
            ) : null}
            {/* Contactar y reportar solo aplican a publicaciones activas: una
                pausada/rechazada se muestra en modo lectura. */}
            {!esDueno && publicacion.status === "ACTIVE" ? (
              <BotonContactar
                listingId={publicacion.id}
                sesionIniciada={Boolean(session)}
              />
            ) : null}
          </div>

          {!esDueno && publicacion.status === "ACTIVE" ? (
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

      {resenas.length > 0 ? (
        <BloqueResenasPublicacion
          resenas={resenas}
          usuarioId={session?.user.id}
        />
      ) : null}
    </main>
  );
}
