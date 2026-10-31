import Link from "next/link";
import { Bell, Heart, MessageCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Contenedor } from "@/components/ui/contenedor";
import { Logo } from "@/components/ui/logo";
import { BuscadorHeader } from "./buscador-header";
import { obtenerCategoriasNavegacion } from "./categorias-navegacion";
import { ContadorNoLeidos } from "./contador-no-leidos";
import { MenuCategorias } from "./menu-categorias";
import { MenuMovil } from "./menu-movil";
import { MenuUsuario, type UsuarioHeader } from "./menu-usuario";

const claseIcono =
  "relative flex size-11 items-center justify-center rounded-control text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400";

const claseEnlaceSecundario =
  "flex h-10 items-center text-sm text-brand-100 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400";

/**
 * Header global. Fila principal en azul de marca: logo, buscador central
 * (pasa a una segunda línea en mobile), Publicar, accesos con contador
 * (favoritos, mensajes, notificaciones) y menú de cuenta. Debajo, en desktop,
 * la barra de categorías. Debajo de lg la navegación vive en el menú lateral.
 */
export async function Navbar() {
  const [session, categorias] = await Promise.all([
    getSession(),
    obtenerCategoriasNavegacion(),
  ]);
  const usuario: UsuarioHeader | null = session
    ? {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        image: session.user.image,
      }
    : null;

  return (
    <header className="bg-brand-800 shadow-header">
      <Contenedor className="flex flex-wrap items-center gap-x-2 gap-y-3 py-3 lg:flex-nowrap lg:gap-x-6">
        <div className="lg:hidden">
          <MenuMovil usuario={usuario} categorias={categorias} />
        </div>

        <Link
          href="/"
          className="rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        >
          {/* Envolturas propias para el display responsive: así no compiten
              con el inline-flex base del Logo. */}
          <span className="block sm:hidden">
            <Logo tono="crema" tamanio="sm" />
          </span>
          <span className="hidden sm:block">
            <Logo tono="crema" />
          </span>
        </Link>

        <div className="order-last w-full lg:order-none lg:max-w-2xl lg:flex-1">
          <BuscadorHeader />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {usuario ? (
            <>
              <div className="mr-1 hidden sm:block">
                <BotonEnlace href="/publicar" variante="acento" tamanio="sm">
                  Publicar
                </BotonEnlace>
              </div>
              <div className="hidden sm:block">
                <Link href="/favoritos" className={claseIcono}>
                  <Heart className="size-5" aria-hidden="true" />
                  <span className="sr-only">Favoritos</span>
                </Link>
              </div>
              <Link href="/mensajes" className={claseIcono}>
                <MessageCircle className="size-5" aria-hidden="true" />
                <span className="sr-only">Mensajes</span>
                <ContadorNoLeidos endpoint="/api/conversaciones/no-leidas" />
              </Link>
              <Link href="/notificaciones" className={claseIcono}>
                <Bell className="size-5" aria-hidden="true" />
                <span className="sr-only">Notificaciones</span>
                <ContadorNoLeidos endpoint="/api/notificaciones/no-leidas" />
              </Link>
              <div className="hidden lg:block">
                <MenuUsuario usuario={usuario} />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="flex h-11 items-center rounded-control px-3 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              >
                Ingresar
              </Link>
              <div className="hidden sm:block">
                <BotonEnlace href="/sign-up" variante="acento" tamanio="sm">
                  Crear cuenta
                </BotonEnlace>
              </div>
            </>
          )}
        </div>
      </Contenedor>

      <div className="hidden border-t border-white/10 lg:block">
        <Contenedor as="nav" aria-label="Categorías" className="flex items-center gap-6">
          {categorias.length > 0 ? <MenuCategorias categorias={categorias} /> : null}
          <ul className="hidden min-w-0 items-center gap-6 xl:flex">
            {categorias.slice(0, 6).map((categoria) => (
              <li key={categoria.id}>
                <Link href={`/categorias/${categoria.slug}`} className={claseEnlaceSecundario}>
                  {categoria.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-6">
            <Link href="/listados" className={claseEnlaceSecundario}>
              Explorar todo
            </Link>
            {usuario ? (
              <Link href="/compras" className={claseEnlaceSecundario}>
                Mis compras
              </Link>
            ) : (
              <Link href="/publicar" className={claseEnlaceSecundario}>
                Vender
              </Link>
            )}
          </div>
        </Contenedor>
      </div>
    </header>
  );
}
