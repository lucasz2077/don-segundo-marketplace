"use client";

import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { unirClases } from "@/components/ui/unir-clases";
import {
  ENLACES_ADMIN,
  ENLACES_COMPRAR,
  ENLACES_CUENTA,
  ENLACES_VENDER,
  type EnlaceNavegacion,
} from "./enlaces-navegacion";
import { useCerrarSesion } from "./use-cerrar-sesion";
import { useDesplegable } from "./use-desplegable";

export type UsuarioHeader = {
  name: string;
  email: string;
  role: string;
  image?: string | null;
};

function GrupoEnlaces({
  titulo,
  enlaces,
  alElegir,
}: {
  titulo: string;
  enlaces: EnlaceNavegacion[];
  alElegir: () => void;
}) {
  return (
    <div className="py-2">
      <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-tinta-tenue">
        {titulo}
      </p>
      <ul>
        {enlaces.map(({ href, etiqueta, icono: Icono }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={alElegir}
              className="flex items-center gap-3 px-4 py-2 text-sm text-tinta hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
            >
              <Icono className="size-4 text-tinta-tenue" aria-hidden="true" />
              {etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Menú de cuenta del header en desktop: avatar + saludo que despliega los
 * accesos de compra, venta, cuenta y administración (con claim ADMIN), y el
 * cierre de sesión. Se cierra al elegir, al hacer click afuera o con Escape.
 */
export function MenuUsuario({ usuario }: { usuario: UsuarioHeader }) {
  const { abierto, setAbierto, refContenedor, refDisparador } = useDesplegable();
  const { cerrando, cerrarSesion } = useCerrarSesion();
  const primerNombre = usuario.name.trim().split(/\s+/)[0] || usuario.name;
  const cerrar = () => setAbierto(false);

  return (
    <div ref={refContenedor} className="relative">
      <button
        ref={refDisparador}
        type="button"
        onClick={() => setAbierto((anterior) => !anterior)}
        aria-expanded={abierto}
        aria-controls="menu-usuario"
        className="flex h-11 items-center gap-2 rounded-control px-2 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <Avatar nombre={usuario.name} imagen={usuario.image} tamanio="sm" />
        <span className="max-w-32 truncate">Hola, {primerNombre}</span>
        <ChevronDown
          className={unirClases("size-4 motion-safe:transition-transform", abierto && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {abierto ? (
        <div
          id="menu-usuario"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-card border border-linea bg-superficie shadow-modal"
        >
          <div className="flex items-center gap-3 border-b border-linea bg-superficie-alt px-4 py-3">
            <Avatar nombre={usuario.name} imagen={usuario.image} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-tinta">{usuario.name}</p>
              <p className="truncate text-xs text-tinta-tenue">{usuario.email}</p>
            </div>
          </div>
          {/* Alto máximo relativo al viewport (valor arbitrario): en pantallas
              bajas el menú scrollea en lugar de salirse de la ventana. */}
          <div className="max-h-[calc(100dvh-10rem)] divide-y divide-linea overflow-y-auto">
            <GrupoEnlaces titulo="Mi cuenta" enlaces={ENLACES_CUENTA} alElegir={cerrar} />
            <GrupoEnlaces titulo="Compras" enlaces={ENLACES_COMPRAR.slice(1)} alElegir={cerrar} />
            <GrupoEnlaces titulo="Ventas" enlaces={ENLACES_VENDER} alElegir={cerrar} />
            {usuario.role === "ADMIN" ? (
              <GrupoEnlaces titulo="Administración" enlaces={ENLACES_ADMIN} alElegir={cerrar} />
            ) : null}
            <div className="py-2">
              <button
                type="button"
                onClick={cerrarSesion}
                disabled={cerrando}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-tinta hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none disabled:opacity-50"
              >
                <LogOut className="size-4 text-tinta-tenue" aria-hidden="true" />
                {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
