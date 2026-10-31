import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Miga = {
  etiqueta: string;
  /** Sin href, la miga es la página actual. */
  href?: string;
};

type MigasProps = {
  items: Miga[];
};

/**
 * Migas de pan (breadcrumb): ubican al usuario dentro del árbol de
 * categorías o de su cuenta. El último ítem es la página actual
 * (`aria-current="page"`) y no es enlace. En mobile las migas pueden partir
 * línea; cada ítem trunca su texto para no desbordar.
 */
export function Migas({ items }: MigasProps) {
  return (
    <nav aria-label="Migas de pan">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-tinta-tenue">
        {items.map((item, indice) => {
          const esUltima = indice === items.length - 1;
          return (
            <li key={`${item.etiqueta}-${indice}`} className="flex min-w-0 items-center gap-1">
              {item.href && !esUltima ? (
                <Link
                  href={item.href}
                  className="inline-block max-w-48 truncate py-1.5 text-brand-600 hover:text-brand-800 hover:underline"
                >
                  {item.etiqueta}
                </Link>
              ) : (
                <span
                  aria-current={esUltima ? "page" : undefined}
                  className="max-w-64 truncate text-tinta-suave"
                >
                  {item.etiqueta}
                </span>
              )}
              {!esUltima ? (
                <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
