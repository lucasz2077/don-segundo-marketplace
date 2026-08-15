import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  obtenerSolicitudVerificacionDetalle,
  SolicitudNoEncontradaError,
} from "@/lib/verificaciones";
import {
  clasesBadgeEstadoSolicitud,
  etiquetasEstadoSolicitud,
} from "@/lib/etiquetas-verificacion";
import { AccionesRevision } from "@/components/verificacion/acciones-revision";

export const dynamic = "force-dynamic";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
});

type DetalleVerificacionPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Detalle de una solicitud de verificación (RF-33, solo admin). Muestra el
 * vendedor, la fecha, el estado actual y los documentos adjuntos (RNF-15:
 * nunca se muestra la URL cruda, solo enlaces con etiqueta que abren el
 * documento en otra pestaña). Si la solicitud ya fue revisada muestra quién y
 * cuándo; si está PENDING delega las acciones en AccionesRevision.
 */
export default async function DetalleVerificacionPage({
  params,
}: DetalleVerificacionPageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  let solicitud;
  try {
    solicitud = await obtenerSolicitudVerificacionDetalle({
      adminId: session.user.id,
      solicitudId: id,
    });
  } catch (error) {
    if (error instanceof SolicitudNoEncontradaError) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href="/admin/verificaciones"
        className="text-sm font-medium text-brand-700 underline"
      >
        Volver a verificaciones
      </Link>

      <header className="mt-4 rounded-lg border border-brand-100 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="estado-verificacion"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${clasesBadgeEstadoSolicitud[solicitud.estado]}`}
          >
            {etiquetasEstadoSolicitud[solicitud.estado]}
          </span>
          <time className="text-xs text-brand-600">
            Solicitada el {formateadorFecha.format(solicitud.createdAt)}
          </time>
        </div>

        <h1 className="mt-3 text-xl font-semibold text-brand-900">
          {solicitud.vendedor.name ?? "Vendedor"}
        </h1>
        {solicitud.vendedor.email ? (
          <p className="mt-1 text-sm text-brand-600">
            {solicitud.vendedor.email}
          </p>
        ) : null}
      </header>

      <section
        className="mt-6 rounded-lg border border-brand-100 bg-white p-4 sm:p-6"
        aria-labelledby="titulo-documentos"
      >
        <h2
          id="titulo-documentos"
          className="text-base font-semibold text-brand-900"
        >
          Documentos presentados
        </h2>
        <p className="mt-1 text-sm text-brand-600">
          Se abren en una pestaña nueva para su revisión.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {solicitud.dniUrl ? (
            <a
              href={solicitud.dniUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex w-fit items-center gap-2 rounded-md text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              Documento de identidad
            </a>
          ) : (
            <p className="text-sm text-brand-600">
              Sin documento de identidad.
            </p>
          )}
          {solicitud.domicilioUrl ? (
            <a
              href={solicitud.domicilioUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex w-fit items-center gap-2 rounded-md text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              Documento de domicilio
            </a>
          ) : null}
        </div>
      </section>

      {solicitud.motivoRechazo ? (
        <section className="mt-6 rounded-lg border border-brand-100 bg-white p-4 sm:p-6">
          <h2 className="text-base font-semibold text-brand-900">
            Motivo del rechazo
          </h2>
          <p className="mt-2 whitespace-pre-line rounded-md bg-bone p-3 text-sm text-brand-900">
            {solicitud.motivoRechazo}
          </p>
        </section>
      ) : null}

      {solicitud.estado !== "PENDING" ? (
        <section className="mt-6 rounded-lg border border-brand-100 bg-white p-4 sm:p-6">
          <h2 className="text-base font-semibold text-brand-900">
            Revisión
          </h2>
          <p className="mt-1 text-sm text-brand-600">
            {solicitud.estado === "APPROVED" ? "Aprobada" : "Rechazada"}{" "}
            {solicitud.revisadoAt ? (
              <>el {formateadorFecha.format(solicitud.revisadoAt)}</>
            ) : null}{" "}
            por{" "}
            <span className="font-medium text-brand-900">
              {solicitud.adminNombre ?? "un administrador"}
            </span>
            .
          </p>
        </section>
      ) : (
        <AccionesRevision solicitudId={solicitud.id} />
      )}
    </main>
  );
}