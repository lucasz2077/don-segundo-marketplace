import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ListingStatus } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth/session";
import { obtenerPublicacionesDelUsuario } from "@/lib/listings";
import { formatearPrecio } from "@/lib/formato";
import { BotonCambioEstadoPublicacion } from "@/components/listing/boton-cambio-estado-publicacion";

export const dynamic = "force-dynamic";

const estiloBadge: Record<ListingStatus, string> = {
  ACTIVE: "rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700",
  PAUSED: "rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-brand-900",
  SOLD: "rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-brand-900",
  REJECTED: "rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-brand-900",
  DELETED: "rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700",
};

const etiquetaBadge: Record<ListingStatus, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  REJECTED: "Rechazada",
  DELETED: "Eliminada",
};

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type ListadoPublicacion = Awaited<
  ReturnType<typeof obtenerPublicacionesDelUsuario>
>[number];

/**
 * Fila de una publicación propia: miniatura, título, precio, estado, stock y
 * vendidas, con las acciones según el estado (Pausar/Reanudar, Editar, link al
 * detalle si está activa).
 */
function FilaPublicacion({ publicacion }: { publicacion: ListadoPublicacion }) {
  const imagen = publicacion.images[0];

  return (
    <li className="rounded-lg border border-brand-100 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-brand-50 sm:w-32">
          {imagen ? (
            <Image
              src={imagen.url}
              alt={imagen.alt ?? publicacion.title}
              fill
              sizes="(max-width: 640px) 100vw, 128px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-brand-600">
              Sin imagen
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={estiloBadge[publicacion.status]}>
              {etiquetaBadge[publicacion.status]}
            </span>
            {publicacion.status === "ACTIVE" && publicacion.stock > 0 ? (
              <span className="text-xs text-brand-600">
                {publicacion.stock === 1
                  ? "Última unidad"
                  : `${publicacion.stock} disponibles`}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 truncate text-sm font-semibold text-brand-900">
            {publicacion.title}
          </h2>
          <p className="mt-1 text-base font-semibold text-brand-900">
            {formatearPrecio(publicacion.price, publicacion.currency)}
          </p>
          <p className="mt-1 text-xs text-brand-600">
            Vendidas: {publicacion.soldCount} · Actualizada{" "}
            {formateadorFecha.format(publicacion.updatedAt)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {publicacion.status === "ACTIVE" ? (
              <>
                <Link
                  href={`/listados/${publicacion.id}`}
                  className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Ver
                </Link>
                <BotonCambioEstadoPublicacion
                  listingId={publicacion.id}
                  accion="pausar"
                />
              </>
            ) : publicacion.status === "PAUSED" ? (
              <BotonCambioEstadoPublicacion
                listingId={publicacion.id}
                accion="reanudar"
              />
            ) : null}
            {/* Una publicación rechazada no se puede editar (deletedAt la
                vuelve invisible para el PATCH), así que no se ofrece la acción. */}
            {publicacion.status !== "REJECTED" ? (
              <Link
                href={`/publicar?id=${publicacion.id}`}
                className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                Editar
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

export default async function MisPublicacionesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/perfil/publicaciones");
  }

  const publicaciones = await obtenerPublicacionesDelUsuario(session.user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-brand-900 dark:text-bone">
            Mis publicaciones
          </h1>
          <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
            Consultá el stock y las vendidas, pausá o reanudá tus publicaciones.
          </p>
        </div>
        <Link
          href="/publicar"
          className="rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Publicar
        </Link>
      </div>

      {publicaciones.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-4">
          {publicaciones.map((publicacion) => (
            <FilaPublicacion key={publicacion.id} publicacion={publicacion} />
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-lg border border-brand-100 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-brand-900">
            Todavía no publicaste nada
          </h2>
          <p className="mt-2 text-sm text-brand-600">
            Cuando publiques un producto vas a poder gestionar su stock y su
            estado desde acá.
          </p>
          <Link
            href="/publicar"
            className="mt-4 inline-block rounded-md bg-brand-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Crear mi primera publicación
          </Link>
        </div>
      )}
    </main>
  );
}