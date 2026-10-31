export type OrdenListado = "recientes" | "precio-asc" | "precio-desc";

/** Filtros vigentes del listado, tal como viajan en la URL de /listados. */
export type FiltrosListado = {
  q?: string;
  categoria?: string;
  condicion?: "NEW" | "USED";
  provincia?: string;
  minPrecio?: number;
  maxPrecio?: number;
  orden?: OrdenListado;
  pagina?: number;
};

type CambiosFiltros = {
  [Clave in keyof FiltrosListado]?: FiltrosListado[Clave] | null;
};

const ORDEN_CLAVES: Array<keyof FiltrosListado> = [
  "q",
  "categoria",
  "condicion",
  "provincia",
  "minPrecio",
  "maxPrecio",
  "orden",
  "pagina",
];

/**
 * Arma la URL de /listados a partir de los filtros vigentes y los cambios
 * pedidos (`null` quita un filtro). Cualquier cambio que no sea de página
 * vuelve a la página 1. Omite el orden por defecto y la página 1 para que
 * las URLs queden limpias y estables (RNF-12).
 */
export function urlListados(
  filtros: FiltrosListado,
  cambios: CambiosFiltros = {},
): string {
  const resultado: FiltrosListado = { ...filtros };
  const cambiaPagina = "pagina" in cambios;
  for (const [clave, valor] of Object.entries(cambios) as Array<
    [keyof FiltrosListado, FiltrosListado[keyof FiltrosListado] | null]
  >) {
    if (valor === null || valor === undefined) {
      delete resultado[clave];
    } else {
      Object.assign(resultado, { [clave]: valor });
    }
  }
  if (!cambiaPagina) {
    delete resultado.pagina;
  }

  const parametros = new URLSearchParams();
  for (const clave of ORDEN_CLAVES) {
    const valor = resultado[clave];
    if (valor === undefined || valor === "") {
      continue;
    }
    if (clave === "orden" && valor === "recientes") {
      continue;
    }
    if (clave === "pagina" && valor === 1) {
      continue;
    }
    parametros.set(clave, String(valor));
  }
  const consulta = parametros.toString();
  return consulta ? `/listados?${consulta}` : "/listados";
}

/** Cantidad de filtros aplicados (sin contar búsqueda, orden ni página). */
export function contarFiltros(filtros: FiltrosListado): number {
  return [
    filtros.categoria,
    filtros.condicion,
    filtros.provincia,
    filtros.minPrecio !== undefined || filtros.maxPrecio !== undefined ? "precio" : undefined,
  ].filter(Boolean).length;
}
