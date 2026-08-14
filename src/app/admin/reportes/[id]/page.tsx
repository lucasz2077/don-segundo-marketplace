import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  ReporteNoEncontradoError,
  listarAcciones,
  obtenerReporteDetalle,
} from "@/lib/reportes";
import {
  etiquetasAccionModeracion,
  etiquetasEstadoReporte,
  etiquetasMotivoReporte,
} from "@/lib/etiquetas-reportes";
import { AccionesReporte } from "@/components/reportes/acciones-reporte";

export const dynamic = "force-dynamic";

const etiquetasEstadoPublicacion: Record<string, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  REJECTED: "Rechazada",
  DELETED: "Eliminada",
};

function formatearFecha(fecha: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
}

type DetalleReportePageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Detalle de un reporte para el panel de moderación (solo administradores).
 * Muestra la publicación vinculada, el reporter, el motivo y el estado actual,
 * junto con el historial cronológico de acciones de moderación (quién, cuándo
 * y qué — RF-25). Las acciones sobre el reporte y la publicación se delegan
 * en AccionesReporte, que aquí sí ofrece pausar/rechazar la publicación.
 */
export default async function DetalleReportePage({
  params,
}: DetalleReportePageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  let reporte;
  let acciones;
  try {
    [reporte, acciones] = await Promise.all([
      obtenerReporteDetalle(session.user.id, id),
      listarAcciones(session.user.id, id),
    ]);
  } catch (error) {
    if (error instanceof ReporteNoEncontradoError) {
      notFound();
    }
    throw error;
  }

  const etiquetaEstadoPublicacion =
    etiquetasEstadoPublicacion[reporte.listing.status] ?? reporte.listing.status;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href="/admin/reportes"
        className="text-sm font-medium text-brand-700 underline"
      >
        Volver a reportes
      </Link>

      <header className="mt-4 rounded-lg border border-brand-100 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="estado-reporte"
            className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
          >
            {etiquetasEstadoReporte[reporte.status]}
          </span>
          <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
            {etiquetaEstadoPublicacion}
          </span>
          <time className="text-xs text-brand-600">
            Reportado el {formatearFecha(reporte.createdAt)}
          </time>
        </div>

        <h1 className="mt-3 text-xl font-semibold text-brand-900">
          <Link
            href={`/listados/${reporte.listing.id}`}
            className="text-brand-700 underline-offset-2 hover:underline"
          >
            {reporte.listing.title}
          </Link>
        </h1>
        <p className="mt-1 text-sm text-brand-600">
          Publicación de{" "}
          <span className="font-medium text-brand-900">
            {reporte.listing.owner.name}
          </span>
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-brand-900 sm:grid-cols-2">
          <div>
            <dt className="text-brand-600">Motivo</dt>
            <dd className="font-medium">{etiquetasMotivoReporte[reporte.reason]}</dd>
          </div>
          <div>
            <dt className="text-brand-600">Reportado por</dt>
            <dd className="font-medium">{reporte.reporter.name}</dd>
          </div>
        </dl>

        {reporte.details ? (
          <p className="mt-4 whitespace-pre-line rounded-md bg-bone p-3 text-sm text-brand-900">
            {reporte.details}
          </p>
        ) : null}
      </header>

      <AccionesReporte
        reporteId={reporte.id}
        listingId={reporte.listing.id}
        estado={reporte.status}
        mostrarAccionesPublicacion
      />

      <section className="mt-8" aria-labelledby="titulo-historial">
        <h2
          id="titulo-historial"
          className="text-base font-semibold text-brand-900"
        >
          Historial de moderación
        </h2>
        <p className="mt-1 text-sm text-brand-600">
          Cada acción administrativa queda registrada con su autor y fecha.
        </p>

        {acciones.length === 0 ? (
          <p className="mt-4 rounded-lg border border-brand-100 bg-white p-6 text-sm text-brand-600">
            Todavía no hay acciones registradas para este reporte.
          </p>
        ) : (
          <ol
            className="mt-4 flex flex-col gap-4"
            aria-label="Historial de acciones de moderación"
          >
            {acciones.map((accion) => (
              <li
                key={accion.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-brand-100 bg-white p-4 text-sm"
              >
                <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {etiquetasAccionModeracion[accion.accion]}
                </span>
                <span className="text-brand-900">
                  {accion.admin.name ?? "Administrador"}
                </span>
                <time className="text-xs text-brand-600">
                  {formatearFecha(accion.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
