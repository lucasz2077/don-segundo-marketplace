import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerMiVerificacion } from "@/lib/verificaciones";
import { BadgeVerificado } from "@/components/verificacion/badge-verificado";
import { FormularioSolicitudVerificacion } from "@/components/verificacion/formulario-solicitud-verificacion";

export const dynamic = "force-dynamic";

const estiloCard =
  "rounded-lg border border-brand-100 bg-white p-6 shadow-sm";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
});

/**
 * Estado de verificación del vendedor y su solicitud (RF-32). Es voluntaria:
 * cuando no hay solicitud (NONE) se explica el beneficio y se ofrece el
 * formulario; con una solicitud en revisión (PENDING) solo informa; con la
 * cuenta verificada (VERIFIED) muestra el sello; y si fue rechazada
 * (REJECTED) explica el motivo y permite re-solicitar (RF-35).
 */
export default async function VerificacionPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/perfil/verificacion");
  }

  const { estado, solicitud } = await obtenerMiVerificacion(session.user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href="/perfil"
        className="text-sm font-medium text-brand-700 underline dark:text-brand-200"
      >
        Volver a Mi perfil
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-brand-900 dark:text-bone">
        Verificación de vendedor
      </h1>
      <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
        Confirmá tu identidad para ganarte la confianza de los compradores.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <section className={estiloCard}>
          {estado === "NONE" ? (
            <>
              <h2 className="text-lg font-semibold text-brand-900">
                Solicitá tu verificación
              </h2>
              <p className="mt-1 text-sm text-brand-600">
                La verificación es voluntaria: al completarla tu perfil muestra
                el sello <BadgeVerificado sellerVerified="VERIFIED" /> y tus
                publicaciones ganan un distintivo de confianza frente a los
                compradores. Se necesita una foto legible de tu documento de
                identidad y, opcionalmente, un documento que acredite tu
                domicilio.
              </p>
              <FormularioSolicitudVerificacion />
            </>
          ) : null}

          {estado === "PENDING" ? (
            <>
              <h2 className="text-lg font-semibold text-brand-900">
                Solicitud en revisión
              </h2>
              <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                En revisión
              </span>
              {solicitud ? (
                <p className="mt-3 text-sm text-brand-600">
                  Enviaste tu solicitud el{" "}
                  <span className="font-medium text-brand-900">
                    {formateadorFecha.format(solicitud.createdAt)}
                  </span>
                  . Un administrador la revisará en breve y vas a recibir una
                  notificación con el resultado.
                </p>
              ) : null}
            </>
          ) : null}

          {estado === "VERIFIED" ? (
            <>
              <h2 className="text-lg font-semibold text-brand-900">
                Cuenta verificada
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <BadgeVerificado sellerVerified={estado} />
              </div>
              <p className="mt-3 text-sm text-brand-600">
                Tu cuenta está verificada: el sello de vendedor verificado ya
                figura en tu perfil público y en tus publicaciones.
              </p>
            </>
          ) : null}

          {estado === "REJECTED" ? (
            <>
              <h2 className="text-lg font-semibold text-brand-900">
                Solicitud rechazada
              </h2>
              <span className="mt-2 inline-flex items-center rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger">
                Rechazada
              </span>
              {solicitud?.motivoRechazo ? (
                <p className="mt-3 text-sm text-brand-600">
                  Motivo:{" "}
                  <span className="whitespace-pre-line font-medium text-brand-900">
                    {solicitud.motivoRechazo}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-sm text-brand-600">
                  Tu solicitud no pudo ser aprobada.
                </p>
              )}
              <p className="mt-3 text-sm text-brand-600">
                Corregí lo que corresponda y volvé a enviar tu solicitud.
              </p>
              <FormularioSolicitudVerificacion />
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}