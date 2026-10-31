import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  Tractor,
} from "lucide-react";
import { Alerta } from "@/components/ui/alerta";
import { Avatar } from "@/components/ui/avatar";
import { Boton } from "@/components/ui/boton";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import {
  AreaTexto,
  Campo,
  Entrada,
  Selector,
  describirCampo,
} from "@/components/ui/campo";
import { Contenedor } from "@/components/ui/contenedor";
import { EstadoError } from "@/components/ui/estado-error";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Insignia } from "@/components/ui/insignia";
import { Logo } from "@/components/ui/logo";
import { Migas } from "@/components/ui/migas";
import { Paginacion } from "@/components/ui/paginacion";
import { Precio } from "@/components/ui/precio";
import { Skeleton } from "@/components/ui/skeleton";
import { Tarjeta } from "@/components/ui/tarjeta";

export const metadata: Metadata = {
  title: "Sistema de diseño — Don Segundo",
  robots: { index: false, follow: false },
};

const PALETAS = [
  { nombre: "brand", tonos: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] },
  { nombre: "accent", tonos: ["300", "400", "500", "600", "700"] },
  { nombre: "sand", tonos: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"] },
] as const;

// Clases literales para que Tailwind las detecte al compilar.
const MUESTRAS: Record<string, string> = {
  "brand-50": "bg-brand-50", "brand-100": "bg-brand-100", "brand-200": "bg-brand-200",
  "brand-300": "bg-brand-300", "brand-400": "bg-brand-400", "brand-500": "bg-brand-500",
  "brand-600": "bg-brand-600", "brand-700": "bg-brand-700", "brand-800": "bg-brand-800",
  "brand-900": "bg-brand-900", "brand-950": "bg-brand-950",
  "accent-300": "bg-accent-300", "accent-400": "bg-accent-400", "accent-500": "bg-accent-500",
  "accent-600": "bg-accent-600", "accent-700": "bg-accent-700",
  "sand-50": "bg-sand-50", "sand-100": "bg-sand-100", "sand-200": "bg-sand-200",
  "sand-300": "bg-sand-300", "sand-400": "bg-sand-400", "sand-500": "bg-sand-500",
  "sand-600": "bg-sand-600", "sand-700": "bg-sand-700", "sand-800": "bg-sand-800",
  "sand-900": "bg-sand-900",
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-linea py-10">
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-tinta-tenue">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/**
 * Catálogo interno del design system (Fase 1 de la reconstrucción estética,
 * ver docs/design-system.md). Visible en desarrollo y en previews de Vercel;
 * en producción responde 404 y no se indexa.
 */
export default function SistemaDeDisenioPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <Contenedor as="main" className="flex-1 py-10">
      <Migas items={[{ etiqueta: "Inicio", href: "/" }, { etiqueta: "Sistema de diseño" }]} />
      <h1 className="mt-4 font-marca text-4xl font-medium text-tinta">Sistema de diseño</h1>
      <p className="mt-2 max-w-2xl text-tinta-suave">
        Primitivas y tokens de Don Segundo. Geist para la interfaz, Alegreya para los
        momentos de marca.
      </p>

      <Seccion titulo="Marca">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-20 items-center rounded-card bg-brand-800 px-6">
            <Logo tono="crema" />
          </div>
          <div className="flex h-20 items-center rounded-card border border-linea bg-superficie px-6">
            <Logo tono="azul" />
          </div>
          <div className="flex h-20 items-center rounded-card bg-brand-800 px-6">
            <Logo tono="crema" tamanio="lg" soloIsotipo />
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Color">
        <div className="flex flex-col gap-4">
          {PALETAS.map((paleta) => (
            <div key={paleta.nombre} className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {paleta.tonos.map((tono) => (
                <div key={tono} className="text-xs text-tinta-tenue">
                  <div
                    className={`h-12 rounded-control ring-1 ring-inset ring-black/5 ${MUESTRAS[`${paleta.nombre}-${tono}`]}`}
                  />
                  <p className="mt-1">
                    {paleta.nombre}-{tono}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Tipografía">
        <div className="flex flex-col gap-3">
          <p className="font-marca text-5xl font-medium">El campo, a un clic</p>
          <p className="text-3xl font-semibold">Título de página</p>
          <p className="text-xl font-semibold">Título de sección</p>
          <p className="text-base">Texto de cuerpo para descripciones y contenido general.</p>
          <p className="text-sm text-tinta-suave">Texto secundario y metadatos.</p>
          <p className="text-xs text-tinta-tenue">Ayudas y notas al pie.</p>
        </div>
      </Seccion>

      <Seccion titulo="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Boton>Primario</Boton>
          <Boton variante="acento">Acento</Boton>
          <Boton variante="secundario">Secundario</Boton>
          <Boton variante="fantasma">Fantasma</Boton>
          <Boton variante="peligro">Peligro</Boton>
          <Boton variante="texto">Texto</Boton>
          <Boton cargando>Enviando...</Boton>
          <Boton disabled>Deshabilitado</Boton>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Boton tamanio="sm">Chico</Boton>
          <Boton tamanio="md">Mediano</Boton>
          <Boton tamanio="lg" variante="acento">
            <Search className="size-5" aria-hidden="true" />
            Grande con ícono
          </Boton>
          <BotonEnlace href="/listados" variante="secundario">
            Enlace con forma de botón
          </BotonEnlace>
        </div>
      </Seccion>

      <Seccion titulo="Insignias">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia>Usado</Insignia>
          <Insignia tono="marca">Nuevo</Insignia>
          <Insignia tono="acento">Destacado</Insignia>
          <Insignia tono="exito" icono={BadgeCheck}>
            Verificado
          </Insignia>
          <Insignia tono="advertencia">Pago pendiente</Insignia>
          <Insignia tono="peligro">Pago fallido</Insignia>
          <Insignia tono="inactivo">Expirada</Insignia>
        </div>
      </Seccion>

      <Seccion titulo="Precio">
        <div className="flex flex-wrap items-end gap-8">
          <Precio precio="1200000" moneda="ARS" tamanio="xl" />
          <Precio precio="15000.5" moneda="USD" tamanio="lg" />
          <Precio precio="85990" moneda="ARS" tamanio="md" />
          <Precio precio="4300" moneda="ARS" tamanio="sm" />
        </div>
      </Seccion>

      <Seccion titulo="Formularios">
        <div className="grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo id="demo-titulo" etiqueta="Título" requerido ayuda="Entre 10 y 120 caracteres.">
            <Entrada
              id="demo-titulo"
              required
              placeholder="Tractor John Deere 5090E"
              aria-describedby={describirCampo("demo-titulo", { ayuda: true })}
            />
          </Campo>
          <Campo id="demo-provincia" etiqueta="Provincia">
            <Selector id="demo-provincia" defaultValue="">
              <option value="">Todas las provincias</option>
              <option>Buenos Aires</option>
              <option>Córdoba</option>
            </Selector>
          </Campo>
          <Campo id="demo-precio" etiqueta="Precio" error="Ingresá un precio mayor a cero.">
            <Entrada
              id="demo-precio"
              invalido
              defaultValue="0"
              aria-describedby={describirCampo("demo-precio", { error: true })}
            />
          </Campo>
          <Campo id="demo-ciudad" etiqueta="Ciudad" opcional>
            <Entrada id="demo-ciudad" disabled placeholder="Deshabilitado" />
          </Campo>
          <Campo id="demo-descripcion" etiqueta="Descripción" className="sm:col-span-2">
            <AreaTexto id="demo-descripcion" placeholder="Estado, horas de uso, accesorios..." />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Alertas y estados">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <Alerta titulo="Vinculá tu cuenta de Mercado Pago">
            Para publicar necesitás vincular tu cuenta.
          </Alerta>
          <Alerta tono="exito" titulo="Pago aprobado">
            Te avisamos cuando el vendedor despache.
          </Alerta>
          <Alerta tono="advertencia" titulo="Tu vínculo con Mercado Pago fue revocado" />
          <EstadoError
            titulo="No pudimos cargar tus compras"
            descripcion="Revisá tu conexión e intentá de nuevo."
            accion={<Boton variante="secundario" tamanio="sm">Reintentar</Boton>}
          />
          <EstadoVacio
            icono={Heart}
            titulo="Todavía no tenés favoritos"
            descripcion="Guardá publicaciones para seguir su precio y disponibilidad."
            accion={<BotonEnlace href="/listados">Explorar publicaciones</BotonEnlace>}
          />
          <Tarjeta className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
          </Tarjeta>
        </div>
      </Seccion>

      <Seccion titulo="Tarjeta, avatar y paginación">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Tarjeta as="article">
            <div className="flex items-center gap-3">
              <Avatar nombre="Estancia La Segunda" tamanio="lg" />
              <div>
                <p className="font-semibold">Estancia La Segunda</p>
                <p className="flex items-center gap-1 text-sm text-tinta-tenue">
                  <MapPin className="size-4" aria-hidden="true" /> Pergamino, Buenos Aires
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Insignia tono="exito" icono={ShieldCheck}>
                Vendedor verificado
              </Insignia>
              <Insignia icono={Tractor}>Maquinaria agrícola</Insignia>
            </div>
          </Tarjeta>
          <div className="flex items-center justify-center">
            <Paginacion
              paginaActual={6}
              totalPaginas={20}
              hrefPagina={(pagina) => `/sistema-de-disenio?pagina=${pagina}`}
            />
          </div>
        </div>
      </Seccion>
    </Contenedor>
  );
}
