import Link from "next/link";
import { X } from "lucide-react";
import type { CategoriaNavegacion } from "@/components/layout/tipos";
import { urlListados, type FiltrosListado } from "./url-listados";

type ChipsFiltrosProps = {
  filtros: FiltrosListado;
  categorias: CategoriaNavegacion[];
};

/** Nombre de una categoría raíz o subcategoría por id. */
export function nombreCategoria(
  categorias: CategoriaNavegacion[],
  id: string | undefined,
): string | undefined {
  if (!id) {
    return undefined;
  }
  for (const categoria of categorias) {
    if (categoria.id === id) {
      return categoria.name;
    }
    const hija = categoria.children.find((subcategoria) => subcategoria.id === id);
    if (hija) {
      return hija.name;
    }
  }
  return undefined;
}

const formateadorMonto = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** Rango de precio legible. El filtro compara montos sin importar la moneda. */
function textoPrecio({ minPrecio, maxPrecio }: FiltrosListado): string | null {
  const formatear = (monto: number) => formateadorMonto.format(monto);
  if (minPrecio !== undefined && maxPrecio !== undefined) {
    return `Precio: ${formatear(minPrecio)} a ${formatear(maxPrecio)}`;
  }
  if (minPrecio !== undefined) {
    return `Precio desde ${formatear(minPrecio)}`;
  }
  if (maxPrecio !== undefined) {
    return `Precio hasta ${formatear(maxPrecio)}`;
  }
  return null;
}

/**
 * Filtros aplicados como chips removibles (un toque quita ese filtro) y
 * "Limpiar todo". En mobile la fila scrollea horizontalmente.
 */
export function ChipsFiltros({ filtros, categorias }: ChipsFiltrosProps) {
  const precio = textoPrecio(filtros);
  const chips = [
    filtros.q ? { etiqueta: `“${filtros.q}”`, href: urlListados(filtros, { q: null }) } : null,
    filtros.categoria
      ? {
          etiqueta: nombreCategoria(categorias, filtros.categoria) ?? "Categoría",
          href: urlListados(filtros, { categoria: null }),
        }
      : null,
    filtros.condicion
      ? {
          etiqueta: filtros.condicion === "NEW" ? "Nuevo" : "Usado",
          href: urlListados(filtros, { condicion: null }),
        }
      : null,
    filtros.provincia
      ? { etiqueta: filtros.provincia, href: urlListados(filtros, { provincia: null }) }
      : null,
    precio
      ? { etiqueta: precio, href: urlListados(filtros, { minPrecio: null, maxPrecio: null }) }
      : null,
  ].filter((chip): chip is { etiqueta: string; href: string } => chip !== null);

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {chips.map((chip) => (
        <Link
          key={chip.href}
          href={chip.href}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 pl-3 pr-2 text-sm text-brand-800 hover:border-brand-300 hover:bg-brand-100"
        >
          {chip.etiqueta}
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">(quitar filtro)</span>
        </Link>
      ))}
      <Link
        href={urlListados({ orden: filtros.orden })}
        className="shrink-0 px-2 text-sm font-medium text-brand-700 hover:underline"
      >
        Limpiar todo
      </Link>
    </div>
  );
}
