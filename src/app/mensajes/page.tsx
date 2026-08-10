import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  obtenerConversacionesDeUsuario,
  type ConversacionResumen,
} from "@/lib/conversaciones";

export const dynamic = "force-dynamic";

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type SeccionConversacionesProps = {
  titulo: string;
  conversaciones: ConversacionResumen[];
};

/**
 * Sección del listado de mensajes: título con el conteo y las filas de las
 * conversaciones. Las filas con mensajes sin leer se resaltan con un fondo
 * suave del acento y textos en negrita.
 */
function SeccionConversaciones({
  titulo,
  conversaciones,
}: SeccionConversacionesProps) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-brand-900">
        {titulo} ({conversaciones.length})
      </h2>
      <ul className="mt-3 divide-y divide-brand-100 overflow-hidden rounded-lg border border-brand-100 bg-white">
        {conversaciones.map((conversacion) => {
          const tieneNoLeidos = conversacion.noLeidos > 0;
          return (
            <li
              key={conversacion.id}
              className={tieneNoLeidos ? "bg-accent-500/10" : undefined}
            >
              <Link
                href={`/mensajes/${conversacion.id}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-brand-50"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-brand-100">
                  {conversacion.listingImagen ? (
                    <Image
                      src={conversacion.listingImagen}
                      alt={conversacion.listingTitulo}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-brand-600">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={
                        tieneNoLeidos
                          ? "truncate text-sm font-bold text-brand-900"
                          : "truncate text-sm font-semibold text-brand-900"
                      }
                    >
                      {conversacion.listingTitulo}
                    </span>
                    <span className="shrink-0 text-xs text-brand-600">
                      {conversacion.lastMessageAt
                        ? formateadorFecha.format(conversacion.lastMessageAt)
                        : formateadorFecha.format(conversacion.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-brand-600">
                    <span
                      className={
                        tieneNoLeidos
                          ? "font-bold text-brand-900"
                          : "font-medium text-brand-900"
                      }
                    >
                      {conversacion.otroParticipante.name}
                    </span>
                    {conversacion.ultimoMensaje
                      ? `: ${conversacion.ultimoMensaje.body}`
                      : ": Sin mensajes aún"}
                  </p>
                </div>

                {tieneNoLeidos ? (
                  <span className="shrink-0 rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-brand-950">
                    {conversacion.noLeidos}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Página de mensajes: lista las conversaciones del usuario agrupadas por su
 * rol ("Comprando" y "Vendiendo") con el último mensaje, la publicación de
 * origen y los no leídos.
 */
export default async function MensajesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/mensajes");
  }

  const conversaciones = await obtenerConversacionesDeUsuario(session.user.id);

  const comprando = conversaciones.filter(
    (conversacion) => conversacion.rol === "comprador"
  );
  const vendiendo = conversaciones.filter(
    (conversacion) => conversacion.rol === "vendedor"
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-900">Mensajes</h1>
      <p className="mt-1 text-sm text-brand-600">
        Tus conversaciones con vendedores y compradores.
      </p>

      {conversaciones.length > 0 ? (
        <div>
          {comprando.length > 0 ? (
            <SeccionConversaciones titulo="Comprando" conversaciones={comprando} />
          ) : null}
          {vendiendo.length > 0 ? (
            <SeccionConversaciones titulo="Vendiendo" conversaciones={vendiendo} />
          ) : null}
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-brand-100 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-brand-900">
            Todavía no hay conversaciones
          </h2>
          <p className="mt-2 text-sm text-brand-600">
            Contactate con un vendedor desde el detalle de una publicación para
            comenzar a conversar.
          </p>
          <Link
            href="/listados"
            className="mt-6 inline-block rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-400"
          >
            Explorar publicaciones
          </Link>
        </div>
      )}
    </main>
  );
}