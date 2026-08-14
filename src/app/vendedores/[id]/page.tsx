import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  formatearTiempoRespuesta,
  obtenerPerfilPublicoVendedor,
} from "@/lib/perfiles";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import { BotonContactar } from "@/components/listing/boton-contactar";
import { BloqueRatingVendedor } from "@/components/vendedores/bloque-rating-vendedor";

export const dynamic = "force-dynamic";

const formateadorDesde = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

type VendedorPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Perfil público de un vendedor (REQ-1..REQ-6). Página de solo lectura y sin
 * sesión requerida; los datos se resuelven con el helper de perfiles (3
 * queries acotadas, sin N+1). Responde 404 si el usuario no existe y oculta
 * bio/businessName/métrica cuando el vendedor no tiene Profile (REQ-3).
 * El contacto se delega en BotonContactar sobre la primera publicación
 * activa (REQ-6); el dueño no ve el botón (REQ-4/BR-5).
 */
export default async function VendedorPage({ params }: VendedorPageProps) {
  const { id } = await params;

  const session = await getSession();
  const perfil = await obtenerPerfilPublicoVendedor(id);
  if (!perfil) {
    notFound();
  }

  const esDueno = session?.user.id === id;
  const primeraActiva = perfil.publicaciones[0];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link
        href="/listados"
        className="text-sm font-medium text-brand-700 underline dark:text-brand-200"
      >
        Volver al listado
      </Link>

      <header className="mt-6 rounded-lg border border-brand-100 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold text-brand-900 dark:text-bone">
              {perfil.usuario.name}
            </h1>
            {perfil.profile?.businessName ? (
              <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-200">
                {perfil.profile.businessName}
              </p>
            ) : null}
            {perfil.rating ? (
              <BloqueRatingVendedor rating={perfil.rating} />
            ) : null}
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">
              En la plataforma desde{" "}
              {formateadorDesde.format(perfil.usuario.createdAt)}
            </p>
            {perfil.metricaRespuesta ? (
              <p className="mt-2 text-sm text-brand-600 dark:text-brand-200">
                Tiempo de respuesta:{" "}
                <span className="font-medium text-brand-900 dark:text-bone">
                  {formatearTiempoRespuesta(perfil.metricaRespuesta.promedioHoras)}
                </span>
              </p>
            ) : null}
            {perfil.profile?.bio ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-brand-900 dark:text-bone">
                {perfil.profile.bio}
              </p>
            ) : null}
          </div>
          {!esDueno && primeraActiva ? (
            <div className="shrink-0">
              <BotonContactar
                listingId={primeraActiva.id}
                sesionIniciada={Boolean(session)}
              />
            </div>
          ) : null}
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-brand-900 dark:text-bone">
          Publicaciones
        </h2>
        {perfil.publicaciones.length > 0 ? (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {perfil.publicaciones.map((publicacion) => (
              <li key={publicacion.id}>
                <TarjetaPublicacion publicacion={publicacion} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-brand-100 bg-white p-10 text-center">
            <p className="text-sm text-brand-600">
              Este vendedor todavía no tiene publicaciones activas.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
