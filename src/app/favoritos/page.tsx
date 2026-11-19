import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { obtenerFavoritos } from "@/lib/favoritos";
import { derivarRatingVendedor } from "@/lib/perfiles";
import { PaginaCuenta } from "@/components/cuenta/pagina-cuenta";
import { BotonQuitarFavorito } from "@/components/listing/boton-quitar-favorito";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Tarjeta } from "@/components/ui/tarjeta";

export const dynamic = "force-dynamic";

/**
 * Una publicación rechazada por moderación o eliminada deja de ser visible
 * (CA-07): en favoritos solo queda un aviso, sin título, fotos ni enlace.
 */
function noDisponible(status: string, deletedAt: Date | null): boolean {
  return status === "REJECTED" || status === "DELETED" || deletedAt !== null;
}

/**
 * Favoritos del usuario: tarjetas de publicación (con sello y reputación,
 * RF-38/RF-52) en grilla de 2 columnas en mobile, cada una con su acción de
 * quitar superpuesta para no agregar una fila extra por tarjeta. Las
 * rechazadas o eliminadas se muestran como "Ya no disponible" (CA-07).
 */
export default async function FavoritosPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/favoritos");
  }

  const favoritos = await obtenerFavoritos(session.user.id);

  return (
    <PaginaCuenta
      titulo="Favoritos"
      descripcion="Las publicaciones que guardaste para revisar más adelante."
    >
      {favoritos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {favoritos.map((favorito) => (
            <li key={favorito.id} className="relative grid">
              {noDisponible(favorito.listing.status, favorito.listing.deletedAt) ? (
                <Tarjeta
                  relleno="ninguno"
                  className="flex min-h-48 flex-col items-center justify-center gap-1 p-4 text-center"
                >
                  <p className="text-sm font-semibold text-tinta">Ya no disponible</p>
                  <p className="text-xs text-tinta-tenue">
                    Esta publicación fue dada de baja. Podés quitarla de tus favoritos.
                  </p>
                </Tarjeta>
              ) : (
                <TarjetaPublicacion
                  publicacion={favorito.listing}
                  sellerVerified={favorito.listing.owner?.profile?.sellerVerified ?? null}
                  rating={derivarRatingVendedor(favorito.listing.owner?.profile)}
                />
              )}
              <div className="absolute right-2 top-2 z-10">
                <BotonQuitarFavorito listingId={favorito.listingId} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EstadoVacio
          icono={Heart}
          titulo="Todavía no guardaste publicaciones"
          descripcion="Tocá el corazón en cualquier publicación para armar tu lista de favoritos."
          accion={<BotonEnlace href="/listados">Explorar publicaciones</BotonEnlace>}
        />
      )}
    </PaginaCuenta>
  );
}
