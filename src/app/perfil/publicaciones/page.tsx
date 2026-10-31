import Image from "next/image";
import { redirect } from "next/navigation";
import { Eye, ImageOff, Package, Pencil, Tag } from "lucide-react";
import type { ListingStatus } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth/session";
import { obtenerPublicacionesDelUsuario } from "@/lib/listings";
import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";
import { BotonCambioEstadoPublicacion } from "@/components/listing/boton-cambio-estado-publicacion";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Insignia, type TonoInsignia } from "@/components/ui/insignia";
import { Precio } from "@/components/ui/precio";
import { Tarjeta } from "@/components/ui/tarjeta";

export const dynamic = "force-dynamic";

const tonoEstado: Record<ListingStatus, TonoInsignia> = {
  ACTIVE: "exito",
  PAUSED: "advertencia",
  SOLD: "neutro",
  REJECTED: "peligro",
  DELETED: "inactivo",
};

const etiquetaBadge: Record<ListingStatus, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  REJECTED: "Rechazada",
  DELETED: "Eliminada",
};

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type ListadoPublicacion = Awaited<
  ReturnType<typeof obtenerPublicacionesDelUsuario>
>[number];

/**
 * Fila de una publicación propia: miniatura, título, precio, estado, stock y
 * vendidas, con las acciones según el estado (Pausar/Reanudar, Editar, link al
 * detalle si está activa).
 */
function FilaPublicacion({ publicacion }: { publicacion: ListadoPublicacion }) {
  const imagen = publicacion.images[0];

  return (
    <li>
      <Tarjeta as="article" relleno="ninguno" className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-control bg-brand-50 sm:h-24 sm:w-32">
            {imagen ? (
              <Image
                src={imagen.url}
                alt={imagen.alt ?? publicacion.title}
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-tinta-tenue">
                <ImageOff className="size-5" aria-hidden="true" />
                <span className="sr-only">Sin foto</span>
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Insignia tono={tonoEstado[publicacion.status]}>
                {etiquetaBadge[publicacion.status]}
              </Insignia>
              {publicacion.status === "ACTIVE" && publicacion.stock > 0 ? (
                <span className="text-xs text-tinta-tenue">
                  {publicacion.stock === 1 ? "Última unidad" : `${publicacion.stock} disponibles`}
                </span>
              ) : null}
            </div>
            <h2 className="mt-1.5 line-clamp-2 text-sm font-medium text-tinta sm:text-base">
              {publicacion.title}
            </h2>
            <Precio
              precio={publicacion.price}
              moneda={publicacion.currency}
              tamanio="sm"
              className="mt-1 font-medium"
            />
            <p className="mt-1 text-xs text-tinta-tenue">
              {publicacion.soldCount} {publicacion.soldCount === 1 ? "vendida" : "vendidas"} ·
              Actualizada el {formateadorFecha.format(publicacion.updatedAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linea pt-4">
          {publicacion.status === "ACTIVE" ? (
            <>
              <BotonEnlace href={`/listados/${publicacion.id}`} variante="secundario" tamanio="sm">
                <Eye className="size-4" aria-hidden="true" />
                Ver
              </BotonEnlace>
              <BotonCambioEstadoPublicacion listingId={publicacion.id} accion="pausar" />
            </>
          ) : publicacion.status === "PAUSED" && publicacion.pausadaPorModeracion ? (
            // RF-25: una pausa de moderación no la puede revertir el dueño.
            <p className="text-sm text-tinta-suave">Pausada por moderación. No podés reanudarla.</p>
          ) : publicacion.status === "PAUSED" ? (
            <BotonCambioEstadoPublicacion listingId={publicacion.id} accion="reanudar" />
          ) : null}
          {/* Una publicación rechazada no se puede editar (deletedAt la
              vuelve invisible para el PATCH), así que no se ofrece la acción. */}
          {publicacion.status !== "REJECTED" ? (
            <BotonEnlace href={`/publicar?id=${publicacion.id}`} variante="secundario" tamanio="sm">
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </BotonEnlace>
          ) : null}
        </div>
      </Tarjeta>
    </li>
  );
}

export default async function MisPublicacionesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/perfil/publicaciones");
  }

  const publicaciones = await obtenerPublicacionesDelUsuario(session.user.id);

  return (
    <PaginaCuenta
      titulo="Mis publicaciones"
      descripcion="Consultá el stock y las vendidas, pausá o reanudá tus publicaciones."
      acciones={
        <BotonEnlace href="/publicar" variante="acento" tamanio="sm">
          <Tag className="size-4" aria-hidden="true" />
          Publicar
        </BotonEnlace>
      }
    >
      {publicaciones.length > 0 ? (
        <ul className="flex flex-col gap-3 sm:gap-4">
          {publicaciones.map((publicacion) => (
            <FilaPublicacion key={publicacion.id} publicacion={publicacion} />
          ))}
        </ul>
      ) : (
        <EstadoVacio
          icono={Package}
          titulo="Todavía no publicaste nada"
          descripcion="Cuando publiques un producto vas a poder gestionar su stock y su estado desde acá."
          accion={
            <BotonEnlace href="/publicar" variante="acento">
              Crear mi primera publicación
            </BotonEnlace>
          }
        />
      )}
    </PaginaCuenta>
  );
}
