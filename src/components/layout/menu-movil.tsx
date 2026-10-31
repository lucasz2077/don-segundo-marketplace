"use client";

import { useRef, type MouseEvent } from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { iconoCategoria } from "@/components/categorias/icono-categoria";
import { Avatar } from "@/components/ui/avatar";
import { BotonEnlace } from "@/components/ui/boton-enlace";
import { Logo } from "@/components/ui/logo";
import {
  ENLACES_ADMIN,
  ENLACES_COMPRAR,
  ENLACES_CUENTA,
  ENLACES_VENDER,
  type EnlaceNavegacion,
} from "./enlaces-navegacion";
import type { UsuarioHeader } from "./menu-usuario";
import type { CategoriaNavegacion } from "./tipos";
import { useCerrarSesion } from "./use-cerrar-sesion";

const claseEnlace =
  "flex min-h-11 items-center gap-3 rounded-control px-3 text-sm text-tinta hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none";

function Seccion({ titulo, enlaces }: { titulo: string; enlaces: EnlaceNavegacion[] }) {
  return (
    <section className="py-3">
      <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-tinta-tenue">
        {titulo}
      </h2>
      <ul>
        {enlaces.map(({ href, etiqueta, icono: Icono }) => (
          <li key={href}>
            <Link href={href} className={claseEnlace}>
              <Icono className="size-5 text-tinta-tenue" aria-hidden="true" />
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

type MenuMovilProps = {
  usuario: UsuarioHeader | null;
  categorias: CategoriaNavegacion[];
};

/**
 * Menú lateral de mobile y tablet (debajo de lg). Usa `<dialog>` modal
 * nativo: atrapa el foco, cierra con Escape y bloquea el fondo sin
 * JavaScript extra. Se cierra al elegir un enlace o tocar fuera del panel.
 * El ancho máximo de 85vw (valor arbitrario) deja una franja del fondo
 * visible para tocar y cerrar en teléfonos angostos.
 */
export function MenuMovil({ usuario, categorias }: MenuMovilProps) {
  const refDialogo = useRef<HTMLDialogElement>(null);
  const { cerrando, cerrarSesion } = useCerrarSesion();

  function cerrar() {
    refDialogo.current?.close();
  }

  function manejarClick(evento: MouseEvent<HTMLDialogElement>) {
    const destino = evento.target as HTMLElement;
    // Click en el backdrop (el propio dialog) o en un enlace: cerrar.
    if (destino === evento.currentTarget || destino.closest("a")) {
      cerrar();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => refDialogo.current?.showModal()}
        aria-haspopup="dialog"
        className="-ml-2 flex size-11 items-center justify-center rounded-control text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <Menu className="size-6" aria-hidden="true" />
        <span className="sr-only">Abrir menú</span>
      </button>

      <dialog
        ref={refDialogo}
        onClick={manejarClick}
        aria-label="Menú principal"
        className="m-0 h-dvh max-h-none w-80 max-w-[85vw] bg-superficie p-0 shadow-modal backdrop:bg-brand-950/60"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between bg-brand-800 px-4">
            <Logo tono="crema" tamanio="sm" />
            <button
              type="button"
              // Foco inicial en "Cerrar" al abrir: evita resaltar el primer enlace.
              autoFocus
              onClick={cerrar}
              className="flex size-11 items-center justify-center rounded-control text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            >
              <X className="size-6" aria-hidden="true" />
              <span className="sr-only">Cerrar menú</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {usuario ? (
              <Link
                href="/perfil"
                className="mx-1 mt-3 flex items-center gap-3 rounded-card bg-superficie-alt p-3"
              >
                <Avatar nombre={usuario.name} imagen={usuario.image} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-tinta">{usuario.name}</p>
                  <p className="truncate text-xs text-tinta-tenue">Ver mi perfil</p>
                </div>
              </Link>
            ) : (
              <div className="mx-1 mt-3 rounded-card bg-superficie-alt p-4">
                <p className="text-sm text-tinta-suave">
                  Ingresá para comprar, publicar y seguir tus favoritos.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <BotonEnlace href="/sign-in" tamanio="sm">
                    Ingresar
                  </BotonEnlace>
                  <BotonEnlace href="/sign-up" variante="secundario" tamanio="sm">
                    Crear cuenta
                  </BotonEnlace>
                </div>
              </div>
            )}

            <div className="divide-y divide-linea">
              <Seccion titulo="Comprar" enlaces={usuario ? ENLACES_COMPRAR : ENLACES_COMPRAR.slice(0, 1)} />
              <Seccion titulo="Vender" enlaces={usuario ? ENLACES_VENDER : ENLACES_VENDER.slice(0, 1)} />
              {usuario ? <Seccion titulo="Mi cuenta" enlaces={ENLACES_CUENTA} /> : null}
              {usuario?.role === "ADMIN" ? (
                <Seccion titulo="Administración" enlaces={ENLACES_ADMIN} />
              ) : null}
              {categorias.length > 0 ? (
                <Seccion
                  titulo="Categorías"
                  enlaces={categorias.map((categoria) => ({
                    href: `/categorias/${categoria.slug}`,
                    etiqueta: categoria.name,
                    icono: iconoCategoria(categoria.slug),
                  }))}
                />
              ) : null}
              {usuario ? (
                <div className="py-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await cerrarSesion();
                      cerrar();
                    }}
                    disabled={cerrando}
                    className={`${claseEnlace} w-full text-left disabled:opacity-50`}
                  >
                    <LogOut className="size-5 text-tinta-tenue" aria-hidden="true" />
                    {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
