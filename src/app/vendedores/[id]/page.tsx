import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Package, Star, Store } from "lucide-react";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth/session";
import {
  formatearTiempoRespuesta,
  obtenerPerfilPublicoVendedor,
} from "@/lib/perfiles";
import { EstrellasCalificacion } from "@/components/compras/estrellas-calificacion";
import { BotonContactar } from "@/components/listing/boton-contactar";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import { Avatar } from "@/components/ui/avatar";
import { Contenedor } from "@/components/ui/contenedor";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Migas } from "@/components/ui/migas";
import { Tarjeta } from "@/components/ui/tarjeta";
import { BadgeVerificado } from "@/components/verificacion/badge-verificado";

export const dynamic = "force-dynamic";

const formateadorDesde = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

type VendedorPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: VendedorPageProps): Promise<Metadata> {
  const { id } = await params;
  const perfil = await obtenerPerfilPublicoVendedor(id).catch(() => null);
  return {
    title: perfil ? `${perfil.usuario.name} — Vendedor en Don Segundo` : "Vendedor — Don Segundo",
  };
}

function Indicador({
  icono,
  titulo,
  children,
}: {
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-card bg-superficie-alt p-3 sm:p-4">
      <p className="flex items-center gap-1.5 truncate text-xs font-medium text-tinta-tenue">
        {icono}
        {titulo}
      </p>
      <div className="text-sm font-semibold text-tinta">{children}</div>
    </div>
  );
}

/**
 * Perfil público de un vendedor (RF-24): encabezado de tienda con avatar,
 * sello verificado (RF-34), nombre comercial y ubicación; indicadores de
 * confianza (calificación con 3+ reseñas, tiempo de respuesta, publicaciones
 * activas); bio y publicaciones activas. Sin sesión requerida; 404 si el
 * usuario no existe. El contacto se delega en BotonContactar sobre la primera
 * publicación activa; el dueño no ve el botón.
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
  const cantidadPublicaciones = perfil.publicaciones.length;

  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <div className="hidden sm:block">
        <Migas
          items={[
            { etiqueta: "Inicio", href: "/" },
            { etiqueta: "Vendedores" },
            { etiqueta: perfil.usuario.name },
          ]}
        />
      </div>

      <Tarjeta as="section" relleno="ninguno" className="overflow-hidden sm:mt-4">
        <div className="h-16 bg-brand-800 sm:h-20" aria-hidden="true" />
        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          <Avatar
            nombre={perfil.usuario.name}
            imagen={perfil.usuario.image}
            tamanio="lg"
            className="-mt-8 ring-4 ring-superficie sm:-mt-10 sm:size-20 sm:text-2xl"
          />
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-tinta sm:text-2xl">
                  {perfil.usuario.name}
                </h1>
                <BadgeVerificado sellerVerified={perfil.profile?.sellerVerified ?? null} />
              </div>
              {perfil.profile?.businessName ? (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-tinta-suave">
                  <Store className="size-4 shrink-0 text-tinta-tenue" aria-hidden="true" />
                  {perfil.profile.businessName}
                </p>
              ) : null}
            </div>
            {!esDueno && primeraActiva ? (
              <div className="w-full sm:w-64 sm:shrink-0">
                <BotonContactar listingId={primeraActiva.id} sesionIniciada={Boolean(session)} />
              </div>
            ) : null}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-tinta-tenue">
            {perfil.usuario.locationLabel ? (
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {perfil.usuario.locationLabel}
              </li>
            ) : null}
            <li className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              En Don Segundo desde {formateadorDesde.format(perfil.usuario.createdAt)}
            </li>
          </ul>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <Indicador icono={<Star className="size-3.5" aria-hidden="true" />} titulo="Calificación">
              {perfil.rating ? (
                <EstrellasCalificacion
                  promedio={perfil.rating.promedio}
                  cantidad={perfil.rating.cantidad}
                  compacta
                />
              ) : (
                <span className="text-xs font-normal text-tinta-tenue">Sin reseñas aún</span>
              )}
            </Indicador>
            <Indicador
              icono={<Clock className="size-3.5" aria-hidden="true" />}
              titulo="Respuesta"
            >
              {perfil.metricaRespuesta ? (
                formatearTiempoRespuesta(perfil.metricaRespuesta.promedioHoras)
              ) : (
                <span className="text-xs font-normal text-tinta-tenue">Sin datos aún</span>
              )}
            </Indicador>
            <Indicador
              icono={<Package className="size-3.5" aria-hidden="true" />}
              titulo="En venta"
            >
              {cantidadPublicaciones}
            </Indicador>
          </div>

          {perfil.profile?.bio ? (
            <div className="mt-5 border-t border-linea pt-5">
              <h2 className="text-sm font-semibold text-tinta">Sobre el vendedor</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-tinta-suave">
                {perfil.profile.bio}
              </p>
            </div>
          ) : null}
        </div>
      </Tarjeta>

      <section aria-labelledby="titulo-publicaciones" className="mt-8">
        <h2 id="titulo-publicaciones" className="mb-4 text-lg font-semibold text-tinta sm:text-xl">
          Publicaciones de {perfil.usuario.name}
        </h2>
        {cantidadPublicaciones > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {perfil.publicaciones.map((publicacion) => (
              <li key={publicacion.id} className="grid">
                <TarjetaPublicacion
                  publicacion={publicacion}
                  sellerVerified={publicacion.sellerVerified}
                  rating={perfil.rating}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVacio
            icono={Package}
            titulo="Sin publicaciones activas"
            descripcion="Este vendedor todavía no tiene publicaciones activas."
          />
        )}
      </section>
    </Contenedor>
  );
}
