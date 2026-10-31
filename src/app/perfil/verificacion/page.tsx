import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerMiVerificacion } from "@/lib/verificaciones";
import { BadgeVerificado } from "@/components/verificacion/badge-verificado";
import { FormularioSolicitudVerificacion } from "@/components/verificacion/formulario-solicitud-verificacion";
import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";

export const dynamic = "force-dynamic";

const estiloCard =
  "rounded-card border border-linea bg-superficie p-4 shadow-card sm:p-6";

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
    <PaginaCuenta
      titulo="Verificación de vendedor"
      descripcion="Confirmá tu identidad para ganarte la confianza de los compradores."
    >
<div className="flex flex-col gap-4 sm:gap-6">
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
              <span className="mt-2 inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning-fuerte ring-1 ring-inset ring-warning/25">
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
              <span className="mt-2 inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger ring-1 ring-inset ring-danger/20">
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
    </PaginaCuenta>
  );
}