import Link from "next/link";
import { redirect } from "next/navigation";
import type { SolicitudVerificacionEstado } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth/session";
import { listarSolicitudesVerificacion } from "@/lib/verificaciones";
import {
  clasesBadgeEstadoSolicitud,
  etiquetasEstadoSolicitud,
} from "@/lib/etiquetas-verificacion";
import { clasesBoton } from "@/components/ui/boton";
import { EstadoVacio } from "@/components/ui/estado-vacio";

export const dynamic = "force-dynamic";

const estadosValidos: SolicitudVerificacionEstado[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

type AdminVerificacionesPageProps = {
  searchParams: Promise<{ estado?: string; pagina?: string }>;
};

/** Construye un enlace del panel conservando los filtros activos y la página. */
function construirUrl(estado?: SolicitudVerificacionEstado, paginaDestino?: number) {
  const parametros = new URLSearchParams();
  if (estado) {
    parametros.set("estado", estado);
  }
  if (paginaDestino !== undefined) {
    parametros.set("pagina", String(paginaDestino));
  }
  const consulta = parametros.toString();
  return consulta ? `/admin/verificaciones?${consulta}` : "/admin/verificaciones";
}

/**
 * Panel admin de solicitudes de verificación (RF-33/RF-37). Lista las
 * solicitudes paginadas con su vendedor y estado, con filtro por estado
 * (chips) y controles Anterior/Siguiente + "Página X de Y" (patrón
 * /admin/reportes). Los documentos solo se muestran en el detalle (RNF-15).
 * Resuelve la data con el service del server, igual que hace /admin/reportes
 * con reportes.ts, sin pasar por la propia API.
 */
export default async function AdminVerificacionesPage({
  searchParams,
}: AdminVerificacionesPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const parametros = await searchParams;
  const estado = estadosValidos.includes(parametros.estado as SolicitudVerificacionEstado)
    ? (parametros.estado as SolicitudVerificacionEstado)
    : undefined;
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  const resultado = await listarSolicitudesVerificacion({
    adminId: session.user.id,
    estado,
    page: pagina,
  });
  const { solicitudes, total, totalPaginas, pagina: paginaActual } = resultado;
  const tieneAnterior = paginaActual > 1;
  const tieneSiguiente = paginaActual < totalPaginas;

  const filtros: Array<{ estado?: SolicitudVerificacionEstado; etiqueta: string }> = [
    { etiqueta: "Todos" },
    ...estadosValidos.map((valor) => ({
      estado: valor,
      etiqueta: etiquetasEstadoSolicitud[valor],
    })),
  ];

  function enlaceFiltro(estadoFiltro?: SolicitudVerificacionEstado) {
    return estadoFiltro
      ? `/admin/verificaciones?estado=${estadoFiltro}`
      : "/admin/verificaciones";
  }

  return (
    <main className="mx-auto w-full max-w-sitio flex-1 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-tinta sm:text-2xl">
        Verificaciones de vendedores
      </h1>
      <p className="mt-2 text-sm text-brand-600">
        Revisá las solicitudes de verificación y aprobalas o rechazalas con su
        motivo.
      </p>

      <div
        className="mt-6 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filtrar solicitudes por estado"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Estado
        </span>
        {filtros.map((filtro) => {
          const activo = estado === filtro.estado;
          return (
            <Link
              key={filtro.etiqueta}
              href={enlaceFiltro(filtro.estado)}
              aria-current={activo ? "page" : undefined}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors ${
                activo
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-linea-fuerte bg-superficie text-tinta-suave hover:border-brand-300"
              }`}
            >
              {filtro.etiqueta}
            </Link>
          );
        })}
      </div>

      {total === 0 ? (
        <div className="mt-8">
          <EstadoVacio
            titulo="No hay solicitudes para mostrar"
            descripcion="Cuando un vendedor solicite su verificación, aparecerá acá para revisarla."
          />
        </div>
      ) : (
        <>
          {solicitudes.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-4">
              {solicitudes.map((solicitud) => (
                <li
                  key={solicitud.id}
                  className="rounded-card border border-linea bg-superficie p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${clasesBadgeEstadoSolicitud[solicitud.estado]}`}
                    >
                      {etiquetasEstadoSolicitud[solicitud.estado]}
                    </span>
                    <time className="text-xs text-brand-600">
                      {formateadorFecha.format(solicitud.createdAt)}
                    </time>
                    {solicitud.estado === "PENDING" ? (
                      <Link
                        href={`/admin/verificaciones/${solicitud.id}`}
                        className={`ml-auto ${clasesBoton({ variante: "secundario", tamanio: "sm" })}`}
                      >
                        Revisar
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-2">
                    <p className="font-semibold text-brand-900">
                      {solicitud.vendedor.name ?? "Vendedor"}
                    </p>
                    {solicitud.vendedor.email ? (
                      <p className="text-sm text-brand-600">
                        {solicitud.vendedor.email}
                      </p>
                    ) : null}
                  </div>

                  {solicitud.estado !== "PENDING" ? (
                    <p className="mt-2 text-xs text-brand-600">
                      {solicitud.estado === "APPROVED" ? "Aprobada por" : "Rechazada por"}{" "}
                      <span className="font-medium text-brand-900">
                        {solicitud.adminNombre ?? "un administrador"}
                      </span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <nav className="mt-8 flex items-center justify-between">
            {tieneAnterior ? (
              <Link
                href={construirUrl(estado, paginaActual - 1)}
                className={clasesBoton({ variante: "secundario" })}
              >
                Anterior
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-control border border-linea px-4 text-sm font-semibold text-brand-300">
                Anterior
              </span>
            )}
            <span className="text-sm text-brand-600">
              Página {paginaActual} de {totalPaginas}
            </span>
            {tieneSiguiente ? (
              <Link
                href={construirUrl(estado, paginaActual + 1)}
                className={clasesBoton({ variante: "secundario" })}
              >
                Siguiente
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-control border border-linea px-4 text-sm font-semibold text-brand-300">
                Siguiente
              </span>
            )}
          </nav>
        </>
      )}
    </main>
  );
}