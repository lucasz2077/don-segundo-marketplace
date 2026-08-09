import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  marcarNotificacionesLeidas,
  obtenerNotificaciones,
} from "@/lib/notificaciones";

export const dynamic = "force-dynamic";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type NotificacionesPageProps = {
  searchParams: Promise<{ pagina?: string }>;
};

/**
 * Página de notificaciones: lista los avisos del usuario (p. ej. publicación
 * pausada o rechazada por un administrador) con su fecha y un enlace a la
 * publicación cuando corresponde. Al renderizar, marca todo el lote como
 * leído para que el badge de la navegación baje.
 */
export default async function NotificacionesPage({
  searchParams,
}: NotificacionesPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/notificaciones");
  }

  const pagina = Math.max(1, Number((await searchParams).pagina) || 1);
  const resultado = await obtenerNotificaciones(session.user.id, pagina);
  await marcarNotificacionesLeidas(session.user.id);

  const { notificaciones, totalPaginas, pagina: paginaActual } = resultado;
  const tieneAnterior = paginaActual > 1;
  const tieneSiguiente = paginaActual < totalPaginas;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-900">Notificaciones</h1>
      <p className="mt-1 text-sm text-brand-600">
        Avisos sobre el estado de tus publicaciones.
      </p>

      {notificaciones.length > 0 ? (
        <>
          <ul className="mt-6 flex flex-col gap-3">
            {notificaciones.map((notificacion) => (
              <li
                key={notificacion.id}
                className="rounded-lg border border-brand-100 bg-white p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-brand-900">
                    {notificacion.title}
                  </h2>
                  <time
                    className="shrink-0 text-xs text-brand-600"
                    dateTime={notificacion.createdAt.toISOString()}
                  >
                    {formateadorFecha.format(notificacion.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-sm text-brand-600">
                  {notificacion.body}
                </p>
                {notificacion.listing ? (
                  <Link
                    href={`/listados/${notificacion.listingId}`}
                    className="mt-2 inline-block text-sm font-medium text-brand-700 underline hover:text-brand-900"
                  >
                    Ver publicación
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>

          {totalPaginas > 1 ? (
            <nav
              className="mt-8 flex items-center justify-between"
              aria-label="Paginación de notificaciones"
            >
              {tieneAnterior ? (
                <Link
                  href={`/notificaciones?pagina=${paginaActual - 1}`}
                  className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-brand-600">
                Página {paginaActual} de {totalPaginas}
              </span>
              {tieneSiguiente ? (
                <Link
                  href={`/notificaciones?pagina=${paginaActual + 1}`}
                  className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Siguiente
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      ) : (
        <div className="mt-10 rounded-lg border border-brand-100 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-brand-900">
            Todavía no hay notificaciones
          </h2>
          <p className="mt-2 text-sm text-brand-600">
            Cuando un administrador pausa o rechaza una de tus publicaciones,
            vas a recibir el aviso acá.
          </p>
        </div>
      )}
    </main>
  );
}