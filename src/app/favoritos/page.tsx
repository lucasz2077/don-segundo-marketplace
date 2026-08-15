import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { obtenerFavoritos } from "@/lib/favoritos";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import { BotonQuitarFavorito } from "@/components/listing/boton-quitar-favorito";

export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?redirect=/favoritos");
  }

  const favoritos = await obtenerFavoritos(session.user.id);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold text-brand-900">Mis favoritos</h1>
      <p className="mt-1 text-sm text-brand-600">
        Las publicaciones que guardaste para revisar más adelante.
      </p>

      {favoritos.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favoritos.map((favorito) => (
            <div
              key={favorito.id}
              className="flex flex-col gap-3 rounded-lg border border-brand-100 bg-white p-3"
            >
              <TarjetaPublicacion
                publicacion={favorito.listing}
                sellerVerified={favorito.listing.owner?.profile?.sellerVerified ?? null}
              />
              <BotonQuitarFavorito listingId={favorito.listingId} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-brand-100 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-brand-900">
            Todavía no guardaste publicaciones
          </h2>
          <p className="mt-2 text-sm text-brand-600">
            Tocá el corazón en cualquier publicación para armar tu lista de favoritos.
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