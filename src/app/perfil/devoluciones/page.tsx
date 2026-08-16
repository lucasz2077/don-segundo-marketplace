import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerSolicitudesDevolucion } from "@/lib/compras";
import { formatearPrecio } from "@/lib/formato";
import {
  clasesBadgeEstadoDevolucion,
  etiquetasEstadoDevolucion,
} from "@/lib/etiquetas-devoluciones";
import { AccionesDevolucion } from "@/components/devoluciones/acciones-devolucion";
import { EstadoVacio } from "@/components/ui/estado-vacio";

export const dynamic = "force-dynamic";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Bandeja de devoluciones del vendedor (RF-49..RF-51, 5.4): RSC
 * server-rendered con sesión obligatoria (sin sesión redirige a /sign-in,
 * patrón dashboard). Lista las solicitudes de devolución recibidas con una
 * sola consulta (sin N+1, `vendedorId` denormalizado): primero las PENDIENTE
 * (las más antiguas primero) y después las resueltas (las más recientes
 * primero). Las PENDIENTE ofrecen Aprobar (reembolso completo, RF-51) y
 * Rechazar con motivo (RF-49) vía AccionesDevolucion; las resueltas muestran
 * el badge de estado y, si fue rechazada, el motivo. Estado vacío con CTA a
 * las publicaciones (E3).
 */
export default async function DevolucionesPerfilPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const solicitudes = await obtenerSolicitudesDevolucion(session.user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-brand-900 dark:text-bone">
            Devoluciones
          </h1>
          <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
            Revisá las solicitudes de devolución de tus ventas y resolvelas.
          </p>
        </div>
        <Link
          href="/perfil"
          className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          Volver al perfil
        </Link>
      </div>

      {solicitudes.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-4">
          {solicitudes.map((solicitud) => {
            const imagen = solicitud.compra.listing.images[0];
            return (
              <li key={solicitud.id}>
                <article className="rounded-card border border-brand-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {imagen ? (
                      <Image
                        src={imagen.url}
                        alt={imagen.alt ?? solicitud.compra.listing.title}
                        width={72}
                        height={72}
                        className="h-18 w-18 shrink-0 rounded-card object-cover"
                      />
                    ) : (
                      <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-card bg-brand-50">
                        <span className="text-xs text-brand-600 dark:text-brand-200">
                          Sin foto
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-medium text-brand-900 dark:text-bone">
                          {solicitud.compra.listing.title}
                        </h2>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${clasesBadgeEstadoDevolucion[solicitud.estado]}`}
                        >
                          {etiquetasEstadoDevolucion[solicitud.estado]}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
                        {solicitud.comprador.name ?? "Comprador"} ·{" "}
                        {formatearPrecio(
                          solicitud.compra.precioUnitario,
                          solicitud.compra.currency
                        )}{" "}
                        · Solicitada el{" "}
                        {formateadorFecha.format(solicitud.createdAt)}
                      </p>

                      <p className="mt-2 text-sm text-brand-900 dark:text-bone">
                        {solicitud.motivo}
                      </p>

                      {solicitud.estado === "RECHAZADA" &&
                      solicitud.motivoRechazo ? (
                        <p className="mt-2 rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                          Motivo del rechazo: {solicitud.motivoRechazo}
                        </p>
                      ) : null}

                      {solicitud.estado === "PENDIENTE" ? (
                        <AccionesDevolucion solicitudId={solicitud.id} />
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6">
          <EstadoVacio
            titulo="No tenés solicitudes de devolución"
            descripcion="Cuando un comprador pida una devolución de una de tus ventas, aparece acá para que la resuelvas."
            accion={
              <Link
                href="/perfil/publicaciones"
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Ver mis publicaciones
              </Link>
            }
          />
        </div>
      )}
    </main>
  );
}