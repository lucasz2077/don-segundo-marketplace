import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ImageOff, MessageCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  obtenerConversacionesDeUsuario,
  type ConversacionResumen,
} from "@/lib/conversaciones";
import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Tarjeta } from "@/components/ui/tarjeta";
import { unirClases } from "@/components/ui/unir-clases";

export const dynamic = "force-dynamic";

const formateadorHora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

const formateadorDia = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
});

/** Momento corto estilo bandeja: hora si es de hoy, día/mes si no. */
function momentoCorto(fecha: Date): string {
  const hoy = new Date();
  const esHoy =
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate();
  return esHoy ? formateadorHora.format(fecha) : formateadorDia.format(fecha);
}

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
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-tenue">
        {titulo} ({conversaciones.length})
      </h2>
      <Tarjeta relleno="ninguno" className="overflow-hidden">
        <ul className="divide-y divide-linea">
          {conversaciones.map((conversacion) => {
            const tieneNoLeidos = conversacion.noLeidos > 0;
            const momento = conversacion.lastMessageAt ?? conversacion.createdAt;
            return (
              <li
                key={conversacion.id}
                className={unirClases("relative", tieneNoLeidos && "bg-accent-300/10")}
              >
                {/* La fila entera abre el chat (enlace estirado); el nombre
                    del otro participante es un enlace propio a su perfil
                    (REQ-8) por encima, sin anidar enlaces. */}
                <div className="flex gap-3 px-4 py-3 hover:bg-brand-50">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-control bg-brand-50">
                    {conversacion.listingImagen ? (
                      <Image
                        src={conversacion.listingImagen}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-tinta-tenue">
                        <ImageOff className="size-4" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href={`/vendedores/${conversacion.otroParticipante.id}`}
                        className={unirClases(
                          "relative z-10 truncate text-sm text-tinta hover:underline",
                          tieneNoLeidos ? "font-bold" : "font-semibold",
                        )}
                      >
                        {conversacion.otroParticipante.name}
                      </Link>
                      <time
                        dateTime={momento.toISOString()}
                        className={unirClases(
                          "shrink-0 text-xs",
                          tieneNoLeidos ? "font-semibold text-brand-700" : "text-tinta-tenue",
                        )}
                      >
                        {momentoCorto(momento)}
                      </time>
                    </div>
                    <Link
                      href={`/mensajes/${conversacion.id}`}
                      className="block truncate text-xs text-tinta-tenue after:absolute after:inset-0"
                    >
                      {conversacion.listingTitulo}
                    </Link>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={unirClases(
                          "truncate text-sm",
                          tieneNoLeidos ? "font-medium text-tinta" : "text-tinta-suave",
                        )}
                      >
                        {conversacion.ultimoMensaje
                          ? conversacion.ultimoMensaje.body
                          : "Sin mensajes aún"}
                      </p>
                      {tieneNoLeidos ? (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-xs font-bold text-brand-950">
                          {conversacion.noLeidos}
                          <span className="sr-only"> sin leer</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Tarjeta>
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
    <PaginaCuenta titulo="Mensajes" descripcion="Tus conversaciones con vendedores y compradores.">
      {conversaciones.length > 0 ? (
        <div className="flex flex-col gap-6">
          {comprando.length > 0 ? (
            <SeccionConversaciones titulo="Comprando" conversaciones={comprando} />
          ) : null}
          {vendiendo.length > 0 ? (
            <SeccionConversaciones titulo="Vendiendo" conversaciones={vendiendo} />
          ) : null}
        </div>
      ) : (
        <EstadoVacio
          icono={MessageCircle}
          titulo="Todavía no hay conversaciones"
          descripcion="Preguntale al vendedor desde el detalle de una publicación para empezar a conversar."
          accion={<BotonEnlace href="/listados">Explorar publicaciones</BotonEnlace>}
        />
      )}
    </PaginaCuenta>
  );
}
