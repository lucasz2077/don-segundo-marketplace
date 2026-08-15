import Link from "next/link";
import { redirect } from "next/navigation";
import type { SolicitudVerificacionEstado } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth/session";
import { listarSolicitudesVerificacion } from "@/lib/verificaciones";
import {
  clasesBadgeEstadoSolicitud,
  etiquetasEstadoSolicitud,
} from "@/lib/etiquetas-verificacion";
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
  searchParams: Promise<{ estado?: string }>;
};

/**
 * Panel admin de solicitudes de verificación (RF-33). Lista las solicitudes
 * con su vendedor y estado, con filtro por estado (chips). Los documentos solo
 * se muestran en el detalle (RNF-15). Resuelve la data con el service del
 * server, igual que hace /admin/reportes con reportes.ts, sin pasar por la
 * propia API.
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

  const solicitudes = await listarSolicitudesVerificacion({
    adminId: session.user.id,
    estado,
  });

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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-brand-900">
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

      {solicitudes.length === 0 ? (
        <div className="mt-8">
          <EstadoVacio
            titulo="No hay solicitudes para mostrar"
            descripcion="Cuando un vendedor solicite su verificación, aparecerá acá para revisarla."
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {solicitudes.map((solicitud) => (
            <li
              key={solicitud.id}
              className="rounded-lg border border-brand-100 bg-white p-4"
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
                    className="ml-auto rounded-md border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
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
      )}
    </main>
  );
}