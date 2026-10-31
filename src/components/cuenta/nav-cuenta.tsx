"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { unirClases } from "@/components/ui/unir-clases";
import { ENLACE_RESUMEN, GRUPOS_CUENTA, type EnlaceCuenta } from "./secciones-cuenta";

function esActivo(pathname: string, href: string): boolean {
  if (href === "/perfil") {
    return pathname === "/perfil";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Enlace({ enlace, activo }: { enlace: EnlaceCuenta; activo: boolean }) {
  const { href, etiqueta, icono: Icono } = enlace;
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={unirClases(
        "flex min-h-10 items-center gap-3 rounded-control px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        activo
          ? "bg-brand-50 font-semibold text-brand-800"
          : "text-tinta-suave hover:bg-brand-50 hover:text-tinta",
      )}
    >
      <Icono
        className={unirClases("size-4", activo ? "text-brand-700" : "text-tinta-tenue")}
        aria-hidden="true"
      />
      {etiqueta}
    </Link>
  );
}

/**
 * Navegación lateral del área "Mi cuenta" (desktop). Marca la sección actual
 * con aria-current; las subrutas (p. ej. /mensajes/[id]) activan su sección.
 */
export function NavCuenta() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mi cuenta" className="flex flex-col gap-4">
      <Enlace enlace={ENLACE_RESUMEN} activo={esActivo(pathname, ENLACE_RESUMEN.href)} />
      {GRUPOS_CUENTA.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-tinta-tenue">
            {grupo.titulo}
          </p>
          <ul className="space-y-0.5">
            {grupo.enlaces.map((enlace) => (
              <li key={enlace.href}>
                <Enlace enlace={enlace} activo={esActivo(pathname, enlace.href)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
