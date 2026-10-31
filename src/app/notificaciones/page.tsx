import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  BellOff,
  Heart,
  MessageCircle,
  Package,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { NotificationTipo } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth/session";
import {
  marcarNotificacionesLeidas,
  obtenerNotificaciones,
  parsearPayload,
  type NotificacionPayload,
} from "@/lib/notificaciones";

import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Paginacion } from "@/components/ui/paginacion";
import { Tarjeta } from "@/components/ui/tarjeta";
import { unirClases } from "@/components/ui/unir-clases";

export const dynamic = "force-dynamic";

/** Ícono de cada tipo de notificación (RF de notificaciones, Slice 3). */
const ICONO_POR_TIPO: Record<NotificationTipo, LucideIcon> = {
  GENERAL: Bell,
  MENSAJE_NUEVO: MessageCircle,
  FAVORITO_CAMBIO_PRECIO: Tag,
  FAVORITO_CAMBIO_ESTADO: Heart,
  ESTADO_PUBLICACION: Package,
};

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type NotificacionesPageProps = {
  searchParams: Promise<{ pagina?: string }>;
};

type Notificacion = Awaited<
  ReturnType<typeof obtenerNotificaciones>
>["notificaciones"][number];

/**
 * Define el enlace de acción de una notificación según su tipo. Las de
 * mensaje nuevo llevan al chat de la conversación; las de cambios en
 * publicaciones propias o favoritas llevan al detalle del listado. Si el
 * payload no se puede parsear, se renderiza sin enlace (nunca lanza).
 */
function EnlaceNotificacion({ notificacion }: { notificacion: Notificacion }) {
  const payload = parsearPayload(notificacion.tipo, notificacion.payload);

  const esTipoMensaje = notificacion.tipo === "MENSAJE_NUEVO";
  const esTipoPublicacion =
    notificacion.tipo === "FAVORITO_CAMBIO_PRECIO" ||
    notificacion.tipo === "FAVORITO_CAMBIO_ESTADO" ||
    notificacion.tipo === "ESTADO_PUBLICACION";

  const payloadMensaje = esTipoMensaje
    ? (payload as Extract<NotificacionPayload, { conversationId: string }> | null)
    : null;
  const payloadPublicacion = esTipoPublicacion
    ? (payload as Extract<NotificacionPayload, { listingId: string }> | null)
    : null;

  if (payloadMensaje) {
    return (
      <Link
        href={`/mensajes/${payloadMensaje.conversationId}`}
        className="mt-1 inline-flex min-h-9 items-center text-sm font-semibold text-brand-700 hover:underline"
      >
        Ver conversación
      </Link>
    );
  }

  // Para los tipos de publicación se usa el listingId del payload, con
  // fallback a la relación listing para notificaciones legadas.
  const listingId = payloadPublicacion?.listingId ?? notificacion.listingId;
  if (esTipoPublicacion && listingId) {
    return (
      <Link
        href={`/listados/${listingId}`}
        className="mt-1 inline-flex min-h-9 items-center text-sm font-semibold text-brand-700 hover:underline"
      >
        Ver publicación
      </Link>
    );
  }

  // GENERAL (legacy): comportamiento original, enlace solo si hay listing.
  if (notificacion.listing) {
    return (
      <Link
        href={`/listados/${notificacion.listingId}`}
        className="mt-1 inline-flex min-h-9 items-center text-sm font-semibold text-brand-700 hover:underline"
      >
        Ver publicación
      </Link>
    );
  }

  return null;
}

/**
 * Página de notificaciones: lista los avisos del usuario (mensajes nuevos,
 * cambios de precio o estado en favoritos y cambios de estado de sus
 * publicaciones) con su fecha y un enlace al chat o a la publicación según el
 * tipo. Al renderizar, marca todo el lote como leído para que el badge de la
 * navegación baje.
 */
export default async function NotificacionesPage({
  searchParams,
}: NotificacionesPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/notificaciones");
  }

  const pagina = Math.max(1, Number((await searchParams).pagina) || 1);
  const resultado = await obtenerNotificaciones(session.user.id, pagina);
  await marcarNotificacionesLeidas(session.user.id);

  const { notificaciones, totalPaginas, pagina: paginaActual } = resultado;

  return (
    <PaginaCuenta
      titulo="Notificaciones"
      descripcion="Mensajes nuevos y cambios en tus publicaciones y favoritos."
    >
      {notificaciones.length > 0 ? (
        <>
          <Tarjeta relleno="ninguno" className="overflow-hidden">
            <ul className="divide-y divide-linea">
              {notificaciones.map((notificacion) => {
                const Icono = ICONO_POR_TIPO[notificacion.tipo] ?? Bell;
                // Se marcan como leídas al renderizar: readAt nulo indica que
                // era nueva al abrir la página.
                const nueva = notificacion.readAt === null;
                return (
                  <li
                    key={notificacion.id}
                    className={unirClases("flex gap-3 px-4 py-4 sm:px-5", nueva && "bg-accent-300/10")}
                  >
                    <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Icono className="size-5" aria-hidden="true" />
                      {nueva ? (
                        <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-accent-500 ring-2 ring-superficie">
                          <span className="sr-only">Nueva</span>
                        </span>
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-sm font-semibold text-tinta">{notificacion.title}</h2>
                        <time
                          className="shrink-0 text-xs text-tinta-tenue"
                          dateTime={notificacion.createdAt.toISOString()}
                        >
                          {formateadorFecha.format(notificacion.createdAt)}
                        </time>
                      </div>
                      <p className="mt-0.5 text-sm text-tinta-suave">{notificacion.body}</p>
                      <EnlaceNotificacion notificacion={notificacion} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
          <div className="mt-6">
            <Paginacion
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              hrefPagina={(numero) =>
                numero === 1 ? "/notificaciones" : `/notificaciones?pagina=${numero}`
              }
            />
          </div>
        </>
      ) : (
        <EstadoVacio
          icono={BellOff}
          titulo="Todavía no hay notificaciones"
          descripcion="Cuando recibas un mensaje, cambie el precio de un favorito o cambie el estado de una publicación, te avisamos acá."
        />
      )}
    </PaginaCuenta>
  );
}
