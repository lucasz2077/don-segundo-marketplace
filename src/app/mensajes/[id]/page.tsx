import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  marcarConversacionLeida,
  obtenerConversacionDetalle,
} from "@/lib/conversaciones";
import { ChatConversacion } from "@/components/mensajes/chat-conversacion";

export const dynamic = "force-dynamic";

type ConversacionPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Página del chat de una conversación. Verifica que el usuario participe,
 * marca los mensajes de la otra parte como leídos al cargar y delega la lista
 * de mensajes y el envío en el componente cliente, que hace polling
 * incremental para mostrar los mensajes nuevos sin recargar.
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
          <Link
            href={`/vendedores/${otro.id}`}
            className="font-medium text-brand-900 underline-offset-2 hover:underline"
          >
            {otro.name}
          </Link>
        </p>
        <p className="mt-1 text-sm text-brand-600">
          {conversacion.buyerId === session.user.id
            ? `Estás comprando en ${conversacion.listing.title}`
            : `Estás vendiendo en ${conversacion.listing.title}`}
        </p>
      </header>

      <ChatConversacion
        conversacionId={conversacion.id}
        usuarioId={session.user.id}
        mensajesIniciales={conversacion.messages.map((mensaje) => ({
          id: mensaje.id,
          senderId: mensaje.senderId,
          body: mensaje.body,
          readAt: mensaje.readAt ? mensaje.readAt.toISOString() : null,
          createdAt: mensaje.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}