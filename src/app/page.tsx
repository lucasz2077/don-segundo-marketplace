import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ChevronRight, RotateCcw, ShieldCheck, Tag } from "lucide-react";
import { obtenerPublicacionesRecientes } from "@/lib/listings";
import { derivarRatingVendedor } from "@/lib/perfiles";
import { IconoCategoria } from "@/components/categorias/icono-categoria";
import { obtenerCategoriasNavegacion } from "@/components/layout/categorias-navegacion";
import { TarjetaPublicacion } from "@/components/listing/tarjeta-publicacion";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Contenedor } from "@/components/ui/contenedor";
import { EstadoVacio } from "@/components/ui/estado-vacio";

export const dynamic = "force-dynamic";

/** Señales de confianza reales (RF-39, RF-34, RF-49), versión compacta. */
const CONFIANZA = [
  { icono: ShieldCheck, texto: "Pagás con Mercado Pago" },
  { icono: BadgeCheck, texto: "Vendedores verificados" },
  { icono: RotateCcw, texto: "7 días para devolver" },
] as const;

function EncabezadoSeccion({
  titulo,
  href,
  etiquetaEnlace,
}: {
  titulo: string;
  href: string;
  etiquetaEnlace: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-lg font-semibold text-tinta sm:text-xl">{titulo}</h2>
      <Link
        href={href}
        className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-brand-600 hover:text-brand-800"
      >
        {etiquetaEnlace}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/**
 * Inicio, mobile-first: hero compacto con acciones y señales de confianza,
 * accesos por categoría (scroll horizontal en mobile, grilla en desktop),
 * publicaciones recién llegadas y llamado a vender.
 */
export default async function HomePage() {
  const [categorias, publicacionesRecientes] = await Promise.all([
    obtenerCategoriasNavegacion(),
    obtenerPublicacionesRecientes(8),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-linea bg-sand-50">
        <Contenedor className="relative py-8 sm:py-14 lg:py-16">
          <div className="max-w-xl">
            <h1 className="font-marca text-3xl font-medium leading-tight text-tinta sm:text-5xl">
              Todo lo que el campo necesita, en un solo lugar
            </h1>
            <p className="mt-3 text-base text-tinta-suave sm:mt-4 sm:text-lg">
              Maquinaria, insumos, hacienda y servicios rurales de productores de todo el país.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
              <BotonEnlace href="/listados" tamanio="lg">
                Explorar
              </BotonEnlace>
              <BotonEnlace href="/publicar" variante="acento" tamanio="lg">
                <Tag className="size-5" aria-hidden="true" />
                Publicar
              </BotonEnlace>
            </div>
            <ul className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {CONFIANZA.map(({ icono: Icono, texto }) => (
                <li key={texto} className="flex items-center gap-2 text-sm text-tinta-suave">
                  <Icono className="size-4 text-success" aria-hidden="true" />
                  {texto}
                </li>
              ))}
            </ul>
          </div>
          <Image
            src="/marca/isotipo-azul.svg"
            alt=""
            width={360}
            height={348}
            priority
            className="pointer-events-none absolute -bottom-6 right-8 hidden opacity-15 lg:block"
          />
        </Contenedor>
      </section>

      {/* Categorías */}
      {categorias.length > 0 ? (
        <Contenedor as="section" aria-labelledby="titulo-categorias" className="pt-8 sm:pt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="titulo-categorias" className="text-lg font-semibold text-tinta sm:text-xl">
              Categorías
            </h2>
          </div>
          {/* Mobile: fila con scroll horizontal y snap; desktop: grilla. */}
          <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0 lg:pb-0">
            {categorias.map((categoria) => {
              return (
                <li key={categoria.id} className="w-24 shrink-0 snap-start lg:w-auto">
                  <Link
                    href={`/categorias/${categoria.slug}`}
                    className="group flex h-full flex-col items-center gap-2 rounded-card border border-linea bg-superficie px-2 py-4 text-center shadow-card motion-safe:transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 group-hover:bg-brand-100">
                      <IconoCategoria slug={categoria.slug} className="size-6" />
                    </span>
                    <span className="line-clamp-2 text-xs font-medium leading-tight text-tinta sm:text-sm">
                      {categoria.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Contenedor>
      ) : null}

      {/* Recién publicadas */}
      <Contenedor as="section" className="pt-8 sm:pt-12">
        <EncabezadoSeccion titulo="Recién publicadas" href="/listados" etiquetaEnlace="Ver todas" />
        {publicacionesRecientes.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {publicacionesRecientes.map((publicacion, indice) => (
              <li key={publicacion.id} className="grid">
                <TarjetaPublicacion
                  publicacion={publicacion}
                  sellerVerified={publicacion.owner?.profile?.sellerVerified ?? null}
                  rating={derivarRatingVendedor(publicacion.owner?.profile)}
                  prioridad={indice < 2}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVacio
            icono={Tag}
            titulo="Sé el primero en publicar"
            descripcion="Todavía no hay publicaciones activas. Publicá tu maquinaria, insumos o hacienda en minutos."
            accion={
              <BotonEnlace href="/publicar" variante="acento">
                Publicar
              </BotonEnlace>
            }
          />
        )}
      </Contenedor>

      {/* Llamado a vender */}
      <Contenedor as="section" className="pt-8 sm:pt-12">
        <div className="relative overflow-hidden rounded-card bg-brand-800 px-6 py-8 sm:px-10 sm:py-10">
          <Image
            src="/marca/isotipo-crema.svg"
            alt=""
            width={220}
            height={213}
            className="pointer-events-none absolute -bottom-8 -right-6 opacity-15 sm:right-6"
          />
          <div className="relative max-w-lg">
            <h2 className="font-marca text-2xl font-medium text-white sm:text-3xl">
              ¿Tenés algo para vender?
            </h2>
            <p className="mt-2 text-sm text-brand-100 sm:text-base">
              Publicá maquinaria, insumos o hacienda en minutos y cobrá tus ventas con Mercado
              Pago.
            </p>
            <BotonEnlace href="/publicar" variante="acento" tamanio="lg" className="mt-6">
              Publicar ahora
            </BotonEnlace>
          </div>
        </div>
      </Contenedor>
    </main>
  );
}
