import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Eye,
  MapPin,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  obtenerPublicacion,
  obtenerPublicacionesActivas,
  obtenerPublicacionPorId,
} from "@/lib/listings";
import { getSession } from "@/lib/auth/session";
import { esFavorito } from "@/lib/favoritos";
import { obtenerResenasDePublicacion } from "@/lib/ratings";
import { derivarRatingVendedor } from "@/lib/perfiles";
import { EstrellasCalificacion } from "@/components/compras/estrellas-calificacion";
import { obtenerCategoriasNavegacion } from "@/components/layout/categorias-navegacion";
import { BarraCompraMovil } from "@/components/listing/barra-compra-movil";
import { BotonComprar } from "@/components/listing/boton-comprar";
import { BotonContactar } from "@/components/listing/boton-contactar";
import { BotonEliminarPublicacion } from "@/components/listing/boton-eliminar-publicacion";
import { BotonReportar } from "@/components/listing/boton-reportar";
import { GaleriaImagenes } from "@/components/listing/galeria-imagenes";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import { BloqueResenasPublicacion } from "@/components/ratings/bloque-resenas-publicacion";
import { Alerta } from "@/components/ui/alerta";
import { Avatar } from "@/components/ui/avatar";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Migas, type Miga } from "@/components/ui/migas";
import { Precio } from "@/components/ui/precio";
import { Tarjeta } from "@/components/ui/tarjeta";
import { BadgeVerificado } from "@/components/verificacion/badge-verificado";

export const dynamic = "force-dynamic";

type DetallePublicacionPageProps = {
  params: Promise<{ id: string }>;
};

const ID_CAJA_COMPRA = "caja-compra";

export async function generateMetadata({ params }: DetallePublicacionPageProps): Promise<Metadata> {
  const { id } = await params;
  // obtenerPublicacion no suma vistas (el contador lo maneja la página).
  const publicacion = await obtenerPublicacion(id).catch(() => null);
  if (!publicacion || publicacion.status !== "ACTIVE") {
    return { title: "Publicación — Don Segundo" };
  }
  return {
    title: `${publicacion.title} — Don Segundo`,
    description: publicacion.description.slice(0, 160),
    openGraph: {
      title: publicacion.title,
      images: publicacion.images[0] ? [{ url: publicacion.images[0].url }] : undefined,
    },
  };
}

/**
 * Detalle de publicación, mobile-first: galería a todo el ancho con gestos,
 * caja de compra (precio, stock, Comprar y Preguntar) con garantías, barra
 * fija de compra al scrollear en mobile, descripción, vendedor con
 * reputación y verificación, reseñas (RF-30) y publicaciones similares.
 * Desde lg la caja de compra queda fija a la derecha de la galería.
 */
export default async function DetallePublicacionPage({
  params,
}: DetallePublicacionPageProps) {
  const { id } = await params;

  const session = await getSession();
  const publicacion = await obtenerPublicacionPorId(id, session?.user.id);

  if (!publicacion) {
    notFound();
  }

  const esDueno = session?.user.id === publicacion.ownerId;
  const esAdmin = session?.user.role === "ADMIN";
  // Se resuelve antes del chequeo de acceso: además de usarse para el estado
  // inicial del favorito, determina si un visitante puede ver una publicación
  // pausada o rechazada (los destinatarios de la notificación de cambio de
  // estado la tienen en favoritos).
  const favoritoInicial = session
    ? await esFavorito(session.user.id, publicacion.id)
    : false;
  // Una publicación pausada o rechazada solo es visible para su dueño, un
  // administrador o un usuario que la tenga en favoritos; el resto recibe 404
  // (RF-13 / CA-07).
  if (
    publicacion.status !== "ACTIVE" &&
    !esDueno &&
    !esAdmin &&
    !favoritoInicial
  ) {
    notFound();
  }

  const activa = publicacion.status === "ACTIVE";
  const comprable = !esDueno && activa && publicacion.stock > 0;
  const ubicacion = publicacion.city
    ? `${publicacion.city}, ${publicacion.province}`
    : publicacion.province;

  const categorias = await obtenerCategoriasNavegacion();
  const padre = categorias.find((raiz) =>
    raiz.children.some((hija) => hija.id === publicacion.categoryId),
  );
  // Similares de la categoría raíz (incluye sus subcategorías): en una
  // subcategoría sola suele haber pocas publicaciones.
  const [resenas, similares] = await Promise.all([
    obtenerResenasDePublicacion(id),
    activa
      ? obtenerPublicacionesActivas({ categoria: padre?.id ?? publicacion.categoryId })
          .then((resultado) =>
            resultado.publicaciones.filter((otra) => otra.id !== publicacion.id).slice(0, 4),
          )
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const migas: Miga[] = [
    { etiqueta: "Inicio", href: "/" },
    ...(padre ? [{ etiqueta: padre.name, href: `/categorias/${padre.slug}` }] : []),
    { etiqueta: publicacion.category.name, href: `/categorias/${publicacion.category.slug}` },
    { etiqueta: publicacion.title },
  ];
  const ratingVendedor = derivarRatingVendedor(publicacion.owner.profile);
  const precio = publicacion.price.toString();

  return (
    <main className="flex-1 pb-12">
      <div className="mx-auto w-full max-w-sitio sm:px-6 sm:pt-4">
        <div className="hidden sm:block">
          <Migas items={migas} />
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:mt-4 sm:gap-y-6 lg:grid-cols-12">
          {/* Galería: a todo el ancho en mobile. */}
          <div className="lg:col-span-7">
            <GaleriaImagenes
              imagenes={publicacion.images}
              titulo={publicacion.title}
              mostrarFavorito={Boolean(session) && !esDueno}
              listingId={publicacion.id}
              inicialFavorito={favoritoInicial}
            />
          </div>

          {/* Caja de compra: fija a la derecha desde lg. */}
          <aside className="px-4 sm:px-0 lg:sticky lg:top-4 lg:col-span-5 lg:col-start-8 lg:row-span-4 lg:row-start-1 lg:self-start">
            <Tarjeta relleno="ninguno" className="p-4 sm:p-6">
              <div id={ID_CAJA_COMPRA}>
                <p className="text-sm text-tinta-tenue">
                  {publicacion.condition === "NEW" ? "Nuevo" : "Usado"}
                  {publicacion.soldCount > 0
                    ? ` · ${publicacion.soldCount} ${publicacion.soldCount === 1 ? "vendido" : "vendidos"}`
                    : null}
                </p>
                <h1 className="mt-1 text-xl font-semibold leading-snug text-tinta sm:text-2xl">
                  {publicacion.title}
                </h1>
                <Link
                  href={`/categorias/${publicacion.category.slug}`}
                  className="mt-1 inline-flex items-center gap-0.5 text-sm text-brand-600 hover:underline sm:hidden"
                >
                  {publicacion.category.name}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>

                <Precio precio={precio} moneda={publicacion.currency} tamanio="xl" className="mt-4" />

                <div className="mt-4 space-y-2">
                  {publicacion.status === "PAUSED" ? (
                    <Alerta tono="advertencia" titulo="Publicación pausada">
                      No aparece en la búsqueda y no se puede comprar por ahora.
                    </Alerta>
                  ) : publicacion.status === "REJECTED" ? (
                    <Alerta tono="peligro" titulo="Publicación rechazada por moderación">
                      No está visible para otros usuarios.
                    </Alerta>
                  ) : publicacion.status === "SOLD" && publicacion.stock === 0 ? (
                    <Alerta tono="info" titulo="Publicación vendida">
                      Ya no tiene unidades disponibles.
                    </Alerta>
                  ) : null}
                  {activa ? (
                    <p className="text-sm font-medium text-tinta">
                      {publicacion.stock === 1
                        ? "¡Última unidad disponible!"
                        : `Stock disponible: ${publicacion.stock} unidades`}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-1.5 text-sm text-tinta-suave">
                    <MapPin className="size-4 shrink-0 text-tinta-tenue" aria-hidden="true" />
                    {ubicacion}
                  </p>
                </div>

                {comprable ? (
                  <div className="mt-5 flex flex-col gap-3">
                    <BotonComprar listingId={publicacion.id} sesionIniciada={Boolean(session)} />
                    <BotonContactar listingId={publicacion.id} sesionIniciada={Boolean(session)} />
                  </div>
                ) : !esDueno && activa ? (
                  <div className="mt-5">
                    <BotonContactar listingId={publicacion.id} sesionIniciada={Boolean(session)} />
                  </div>
                ) : null}
              </div>

              {esDueno ? (
                <div className="mt-5">
                  <Alerta
                    titulo="Esta es tu publicación"
                    accion={
                      <div className="flex flex-wrap gap-2">
                        <BotonEnlace href={`/publicar?id=${publicacion.id}`} variante="secundario">
                          <Pencil className="size-4" aria-hidden="true" />
                          Editar
                        </BotonEnlace>
                        <BotonEliminarPublicacion listingId={publicacion.id} />
                      </div>
                    }
                  >
                    {publicacion.viewCount} {publicacion.viewCount === 1 ? "vista" : "vistas"} ·{" "}
                    {publicacion.soldCount} {publicacion.soldCount === 1 ? "vendido" : "vendidos"}
                  </Alerta>
                </div>
              ) : (
                <ul className="mt-5 space-y-3 border-t border-linea pt-5">
                  <li className="flex gap-3 text-sm">
                    <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
                    <span className="text-tinta-suave">
                      <span className="font-medium text-tinta">Pagás con Mercado Pago.</span> Tu
                      pago se procesa de forma segura.
                    </span>
                  </li>
                  <li className="flex gap-3 text-sm">
                    <RotateCcw className="size-5 shrink-0 text-success" aria-hidden="true" />
                    <span className="text-tinta-suave">
                      <span className="font-medium text-tinta">7 días para devolver.</span>{" "}
                      Solicitalo desde Mis compras si algo no está bien.
                    </span>
                  </li>
                </ul>
              )}
            </Tarjeta>
          </aside>

          {/* Descripción */}
          <section
            aria-labelledby="titulo-descripcion"
            className="px-4 sm:px-0 lg:col-span-7"
          >
            <Tarjeta relleno="ninguno" className="p-4 sm:p-6">
              <h2 id="titulo-descripcion" className="text-lg font-semibold text-tinta">
                Descripción
              </h2>
              <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-tinta-suave">
                {publicacion.description}
              </p>
            </Tarjeta>
          </section>

          {/* Vendedor */}
          <section aria-labelledby="titulo-vendedor" className="px-4 sm:px-0 lg:col-span-7">
            <Tarjeta relleno="ninguno" className="p-4 sm:p-6">
              <h2 id="titulo-vendedor" className="text-lg font-semibold text-tinta">
                Información del vendedor
              </h2>
              <div className="mt-4 flex items-start gap-3">
                <Avatar nombre={publicacion.owner.name} tamanio="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-tinta">{publicacion.owner.name}</p>
                    <BadgeVerificado
                      sellerVerified={publicacion.owner.profile?.sellerVerified ?? null}
                    />
                  </div>
                  {publicacion.owner.profile?.businessName ? (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-tinta-suave">
                      <Store className="size-4 shrink-0 text-tinta-tenue" aria-hidden="true" />
                      {publicacion.owner.profile.businessName}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    {ratingVendedor ? (
                      <EstrellasCalificacion
                        promedio={ratingVendedor.promedio}
                        cantidad={ratingVendedor.cantidad}
                        tamanio="sm"
                      />
                    ) : (
                      <p className="text-sm text-tinta-tenue">Sin reseñas aún</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-linea pt-4 sm:flex-row sm:items-center sm:justify-between">
                <BotonEnlace
                  href={`/vendedores/${publicacion.owner.id}`}
                  variante="secundario"
                  tamanio="sm"
                >
                  Ver perfil y publicaciones
                </BotonEnlace>
                {!esDueno && activa ? (
                  <BotonReportar listingId={publicacion.id} sesionIniciada={Boolean(session)} />
                ) : null}
              </div>
            </Tarjeta>
          </section>

          {resenas.length > 0 ? (
            <div className="px-4 sm:px-0 lg:col-span-7">
              <BloqueResenasPublicacion resenas={resenas} usuarioId={session?.user.id} />
            </div>
          ) : null}
        </div>

        {!esDueno ? (
          <p className="mt-6 flex items-center gap-1.5 px-4 text-xs text-tinta-tenue sm:px-0">
            <Eye className="size-3.5" aria-hidden="true" />
            {publicacion.viewCount} {publicacion.viewCount === 1 ? "vista" : "vistas"}
          </p>
        ) : null}

        {similares.length > 0 ? (
          <section aria-labelledby="titulo-similares" className="mt-10 px-4 sm:px-0">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 id="titulo-similares" className="text-lg font-semibold text-tinta sm:text-xl">
                Publicaciones similares
              </h2>
              <Link
                href={`/categorias/${publicacion.category.slug}`}
                className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-brand-600 hover:text-brand-800"
              >
                Ver más
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {similares.map((otra) => (
                <li key={otra.id} className="grid">
                  <TarjetaPublicacion
                    publicacion={otra}
                    sellerVerified={otra.owner?.profile?.sellerVerified ?? null}
                    rating={derivarRatingVendedor(otra.owner?.profile)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {comprable ? (
        <BarraCompraMovil
          idCajaCompra={ID_CAJA_COMPRA}
          listingId={publicacion.id}
          precio={precio}
          moneda={publicacion.currency}
          sesionIniciada={Boolean(session)}
        />
      ) : null}
    </main>
  );
}
