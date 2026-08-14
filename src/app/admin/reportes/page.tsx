import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReportReason, ReportStatus } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth/session";
import { obtenerReportes } from "@/lib/reportes";
import {
  etiquetasEstadoReporte,
  etiquetasMotivoReporte,
} from "@/lib/etiquetas-reportes";
import { AccionesReporte } from "@/components/reportes/acciones-reporte";

export const dynamic = "force-dynamic";

const estadosValidos: ReportStatus[] = ["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"];

const motivosValidos: ReportReason[] = [
  "SPAM",
  "INAPPROPRIATE",
  "FRAUD",
  "DUPLICATE",
  "OTHER",
];

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

type AdminReportesPageProps = {
  searchParams: Promise<{ pagina?: string; estado?: string; motivo?: string }>;
};

/** Construye un enlace del panel conservando los filtros activos indicados. */
function enlaceFiltros(estado?: ReportStatus, motivo?: ReportReason) {
  const parametros = new URLSearchParams();
  if (estado) {
    parametros.set("estado", estado);
  }
  if (motivo) {
    parametros.set("motivo", motivo);
  }
  const consulta = parametros.toString();
  return consulta ? `/admin/reportes?${consulta}` : "/admin/reportes";
}

export default async function AdminReportesPage({
  searchParams,
}: AdminReportesPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const parametros = await searchParams;
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const estado = estadosValidos.includes(parametros.estado as ReportStatus)
    ? (parametros.estado as ReportStatus)
    : undefined;
  const motivo = motivosValidos.includes(parametros.motivo as ReportReason)
    ? (parametros.motivo as ReportReason)
    : undefined;
  const resultado = await obtenerReportes(session.user.id, {
    estado,
    motivo,
    pagina,
  });
  if (!resultado) {
    redirect("/");
  }

  const { reportes, totalPaginas, pagina: paginaActual } = resultado;
  const tieneAnterior = paginaActual > 1;
  const tieneSiguiente = paginaActual < totalPaginas;

  const filtrosEstado: Array<{ estado?: ReportStatus; etiqueta: string }> = [
    { etiqueta: "Todos" },
    ...estadosValidos.map((status) => ({
      estado: status,
      etiqueta: etiquetasEstadoReporte[status],
    })),
  ];

  const filtrosMotivo: Array<{ motivo?: ReportReason; etiqueta: string }> = [
    { etiqueta: "Todos" },
    ...motivosValidos.map((reason) => ({
      motivo: reason,
      etiqueta: etiquetasMotivoReporte[reason],
    })),
  ];

  function enlacePagina(paginaDestino: number) {
    const parametrosEnlace = new URLSearchParams();
    if (estado) {
      parametrosEnlace.set("estado", estado);
    }
    if (motivo) {
      parametrosEnlace.set("motivo", motivo);
    }
    parametrosEnlace.set("pagina", String(paginaDestino));
    return `/admin/reportes?${parametrosEnlace.toString()}`;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-brand-900">
        Reportes y moderación
      </h1>
      <p className="mt-2 text-sm text-brand-600">
        Revisa los reportes de la comunidad y modera las publicaciones que
        infrinjan las normas.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filtrar reportes por estado"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Estado
          </span>
          {filtrosEstado.map((filtro) => {
            const activo = estado === filtro.estado;
            return (
              <Link
                key={filtro.etiqueta}
                href={enlaceFiltros(filtro.estado, motivo)}
                aria-current={activo ? "page" : undefined}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activo
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-brand-300 text-brand-700 hover:bg-brand-50"
                }`}
              >
                {filtro.etiqueta}
              </Link>
            );
          })}
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filtrar reportes por motivo"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Motivo
          </span>
          {filtrosMotivo.map((filtro) => {
            const activo = motivo === filtro.motivo;
            return (
              <Link
                key={filtro.etiqueta}
                href={enlaceFiltros(estado, filtro.motivo)}
                aria-current={activo ? "page" : undefined}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activo
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-brand-300 text-brand-700 hover:bg-brand-50"
                }`}
              >
                {filtro.etiqueta}
              </Link>
            );
          })}
        </div>
      </div>

      {reportes.length === 0 ? (
        <p className="mt-8 rounded-lg border border-brand-100 bg-white p-6 text-sm text-brand-600">
          No hay reportes para mostrar por ahora.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {reportes.map((reporte) => (
            <li
              key={reporte.id}
              className="rounded-lg border border-brand-100 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {etiquetasEstadoReporte[reporte.status]}
                </span>
                <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {etiquetasEstadoPublicacion[reporte.listing.status] ?? reporte.listing.status}
                </span>
                <time className="text-xs text-brand-600">
                  {formatearFecha(reporte.createdAt)}
                </time>
                <Link
                  href={`/admin/reportes/${reporte.id}`}
                  className="ml-auto rounded-md border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Ver detalle
                </Link>
              </div>

              <h2 className="mt-3 text-base font-semibold text-brand-900">
                <Link
                  href={`/listados/${reporte.listing.id}`}
                  className="text-brand-700 underline hover:text-brand-900"
                >
                  {reporte.listing.title}
                </Link>
              </h2>

              <dl className="mt-2 grid grid-cols-1 gap-1 text-sm text-brand-900 sm:grid-cols-2">
                <div>
                  <dt className="text-brand-600">Motivo</dt>
                  <dd className="font-medium">
                    {etiquetasMotivoReporte[reporte.reason]}
                  </dd>
                </div>
                <div>
                  <dt className="text-brand-600">Reportado por</dt>
                  <dd className="font-medium">{reporte.reporter.name}</dd>
                </div>
              </dl>

              {reporte.details ? (
                <p className="mt-3 whitespace-pre-line rounded-md bg-bone p-3 text-sm text-brand-900">
                  {reporte.details}
                </p>
              ) : null}

              <AccionesReporte
                reporteId={reporte.id}
                listingId={reporte.listing.id}
              />
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 ? (
        <nav className="mt-8 flex items-center justify-between" aria-label="Paginación de reportes">
          {tieneAnterior ? (
            <Link
              href={enlacePagina(paginaActual - 1)}
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
              href={enlacePagina(paginaActual + 1)}
              className="rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}