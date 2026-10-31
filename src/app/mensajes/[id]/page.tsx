import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  marcarConversacionLeida,
  obtenerConversacionDetalle,
} from "@/lib/conversaciones";
import { ChevronLeft } from "lucide-react";
import { ChatConversacion } from "@/components/mensajes/chat-conversacion";
import { Avatar } from "@/components/ui/avatar";
import { Contenedor } from "@/components/ui/contenedor";

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

  const comprando = conversacion.buyerId === session.user.id;

  return (
    <Contenedor as="main" className="flex-1 py-3 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-3 flex items-center gap-2 sm:gap-3">
          <Link
            href="/mensajes"
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-control text-brand-700 hover:bg-brand-50"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
            <span className="sr-only">Volver a mensajes</span>
          </Link>
          <Avatar nombre={otro.name} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/vendedores/${otro.id}`}
              className="block truncate font-semibold text-tinta hover:underline"
            >
              {otro.name}
            </Link>
            <p className="truncate text-xs text-tinta-tenue">
              {comprando ? "Comprando" : "Vendiendo"}:{" "}
              <Link
                href={`/listados/${conversacion.listing.id}`}
                className="font-medium text-brand-600 hover:underline"
              >
                {conversacion.listing.title}
              </Link>
            </p>
          </div>
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
      </div>
    </Contenedor>
  );
}