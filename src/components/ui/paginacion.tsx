import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { unirClases } from "./unir-clases";

/** Marcador de salto entre números de página ("…"). */
export const SALTO = "salto" as const;

/**
 * Páginas a mostrar en la paginación: siempre la primera y la última, la
 * actual con `vecinas` a cada lado y "…" donde hay huecos. Si el hueco es de
 * una sola página se muestra el número en lugar del salto.
 * Ej.: actual 6 de 20 → [1, …, 5, 6, 7, …, 20].
 */
export function paginasVisibles(
  actual: number,
  total: number,
  vecinas = 1,
): Array<number | typeof SALTO> {
  if (total <= 0) {
    return [];
  }
  const desde = Math.max(2, actual - vecinas);
  const hasta = Math.min(total - 1, actual + vecinas);
  const paginas: Array<number | typeof SALTO> = [1];

  if (desde === 3) {
    paginas.push(2);
  } else if (desde > 3) {
    paginas.push(SALTO);
  }
  for (let pagina = desde; pagina <= hasta; pagina++) {
    paginas.push(pagina);
  }
  if (hasta === total - 2) {
    paginas.push(total - 1);
  } else if (hasta < total - 2) {
    paginas.push(SALTO);
  }
  if (total > 1) {
    paginas.push(total);
  }
  return paginas;
}

type PaginacionProps = {
  paginaActual: number;
  totalPaginas: number;
  /** Arma la URL de cada página conservando los filtros vigentes. */
  hrefPagina: (pagina: number) => string;
};

const claseItem =
  "inline-flex size-10 items-center justify-center rounded-control text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

/**
 * Paginación numerada por enlaces (navegable sin JavaScript, compatible con
 * los listados server-side). Server Component: `hrefPagina` se ejecuta en el
 * servidor. No se renderiza con una sola página.
 */
export function Paginacion({
  paginaActual,
  totalPaginas,
  hrefPagina,
}: PaginacionProps) {
  if (totalPaginas <= 1) {
    return null;
  }

  const anterior = paginaActual > 1 ? paginaActual - 1 : null;
  const siguiente = paginaActual < totalPaginas ? paginaActual + 1 : null;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-1">
      {anterior ? (
        <Link
          href={hrefPagina(anterior)}
          className={unirClases(claseItem, "text-brand-700 hover:bg-brand-50")}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={unirClases(claseItem, "text-brand-300")} aria-hidden="true">
          <ChevronLeft className="size-5" />
        </span>
      )}

      <ol className="flex items-center gap-1">
        {paginasVisibles(paginaActual, totalPaginas).map((pagina, indice) =>
          pagina === SALTO ? (
            <li key={`salto-${indice}`} className="px-1 text-sm text-tinta-tenue" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={pagina}>
              {pagina === paginaActual ? (
                <span
                  aria-current="page"
                  className={unirClases(claseItem, "bg-brand-700 text-white")}
                >
                  {pagina}
                </span>
              ) : (
                <Link
                  href={hrefPagina(pagina)}
                  className={unirClases(claseItem, "text-brand-700 hover:bg-brand-50")}
                  aria-label={`Página ${pagina}`}
                >
                  {pagina}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>

      {siguiente ? (
        <Link
          href={hrefPagina(siguiente)}
          className={unirClases(claseItem, "text-brand-700 hover:bg-brand-50")}
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={unirClases(claseItem, "text-brand-300")} aria-hidden="true">
          <ChevronRight className="size-5" />
        </span>
      )}
    </nav>
  );
}
