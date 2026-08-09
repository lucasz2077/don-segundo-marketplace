import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  marcarConversacionLeida,
  obtenerConversacionDetalle,
} from "@/lib/conversaciones";
import { FormularioMensaje } from "@/components/mensajes/formulario-mensaje";

export const dynamic = "force-dynamic";

const formateadorFechaCompleta = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type ConversacionPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Página del chat de una conversación. Verifica que el usuario participe,
 * marca los mensajes de la otra parte como leídos al cargar y muestra las
 * burbujas de la conversación con el formulario para responder.
 */
export default async function ConversacionPage({ params }: ConversacionPageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/mensajes");
  }

  const conversacion = await obtenerConversacionDetalle(id, session.user.id);
  if (!conversacion) {
    notFound();
  }

  await marcarConversacionLeida(id, session.user.id);

  const otro = conversacion.otroParticipante;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href="/mensajes"
        className="text-sm font-medium text-brand-700 underline"
      >
        Volver a mensajes
      </Link>

      <header className="mt-4 rounded-lg border border-brand-100 bg-white p-4">
        <Link
          href={`/listados/${conversacion.listing.id}`}
          className="text-lg font-semibold text-brand-900 underline-offset-2 hover:underline"
        >
          {conversacion.listing.title}
        </Link>
        <p className="mt-1 text-sm text-brand-600">
          Conversación con{" "}
          <span className="font-medium text-brand-900">{otro.name}</span>
        </p>
      </header>

      <div className="mt-6 space-y-4 rounded-lg border border-brand-100 bg-white p-4">
        {conversacion.messages.length > 0 ? (
          conversacion.messages.map((mensaje) => {
            const esPropio = mensaje.senderId === session.user.id;
            return (
              <div
                key={mensaje.id}
                className={esPropio ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    esPropio
                      ? "max-w-[75%] rounded-lg bg-brand-700 px-4 py-2 text-white"
                      : "max-w-[75%] rounded-lg bg-brand-100 px-4 py-2 text-brand-900"
                  }
                >
                  <p className="whitespace-pre-line text-sm">{mensaje.body}</p>
                  <p
                    className={
                      esPropio
                        ? "mt-1 text-right text-[10px] text-brand-100"
                        : "mt-1 text-right text-[10px] text-brand-600"
                    }
                  >
                    {formateadorFechaCompleta.format(mensaje.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-brand-600">
            Enviá un mensaje para comenzar la conversación.
          </p>
        )}
      </div>

      <FormularioMensaje conversacionId={conversacion.id} />
    </main>
  );
}