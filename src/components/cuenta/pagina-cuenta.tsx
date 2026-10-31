import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Contenedor } from "@/components/ui/contenedor";
import { Tarjeta } from "@/components/ui/tarjeta";
import { NavCuenta } from "./nav-cuenta";

type PaginaCuentaProps = {
  titulo: string;
  descripcion?: string;
  /** Acción principal de la sección (p. ej. "Publicar", "Agregar dirección"). */
  acciones?: ReactNode;
  /** Oculta el regreso a "Mi cuenta" en mobile (lo usa el propio índice /perfil). */
  sinRegreso?: boolean;
  children: ReactNode;
};

/**
 * Envoltorio de las páginas del área "Mi cuenta": navegación lateral fija en
 * desktop y, en mobile, un regreso "Mi cuenta" arriba del título (el índice
 * de secciones vive en /perfil). Encabezado con título, descripción y acción.
 */
export function PaginaCuenta({
  titulo,
  descripcion,
  acciones,
  sinRegreso = false,
  children,
}: PaginaCuentaProps) {
  return (
    <Contenedor as="main" className="flex-1 py-4 sm:py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <aside className="hidden lg:block">
          <Tarjeta relleno="sm" className="sticky top-4">
            <NavCuenta />
          </Tarjeta>
        </aside>

        <div className="min-w-0 lg:col-span-3">
          {!sinRegreso ? (
            <Link
              href="/perfil"
              className="-ml-1 mb-2 inline-flex min-h-10 items-center gap-0.5 text-sm font-medium text-brand-600 hover:text-brand-800 lg:hidden"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Mi cuenta
            </Link>
          ) : null}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-tinta sm:text-2xl">{titulo}</h1>
              {descripcion ? (
                <p className="mt-1 text-sm text-tinta-tenue">{descripcion}</p>
              ) : null}
            </div>
            {acciones ? <div className="shrink-0">{acciones}</div> : null}
          </div>
          {children}
        </div>
      </div>
    </Contenedor>
  );
}
