"use client";

type FiltrosBusquedaProps = {
  busquedaActual: string;
  categoriaActual: string;
  provinciaActual: string;
  ordenActual: string;
  categorias: Array<{ id: string; name: string; slug: string }>;
  provincias: readonly string[];
};

const claseCampo =
  "w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none";

/**
 * Barra de búsqueda y filtros del listado. Es un formulario GET que navega a
 * /listados con los parámetros elegidos; los selectores envían el formulario
 * automáticamente al cambiar.
 */
export function FiltrosBusqueda({
  busquedaActual,
  categoriaActual,
  provinciaActual,
  ordenActual,
  categorias,
  provincias,
}: FiltrosBusquedaProps) {
  return (
    <form action="/listados" method="GET" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input
        type="search"
        name="q"
        defaultValue={busquedaActual}
        placeholder="Buscar por título o descripción"
        aria-label="Buscar publicaciones"
        className={`${claseCampo} lg:col-span-2`}
      />
      <select
        name="categoria"
        defaultValue={categoriaActual}
        onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
        aria-label="Filtrar por categoría"
        className={claseCampo}
      >
        <option value="">Todas las categorías</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.name}
          </option>
        ))}
      </select>
      <select
        name="provincia"
        defaultValue={provinciaActual}
        onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
        aria-label="Filtrar por provincia"
        className={claseCampo}
      >
        <option value="">Todas las provincias</option>
        {provincias.map((provincia) => (
          <option key={provincia} value={provincia}>
            {provincia}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <select
          name="orden"
          defaultValue={ordenActual}
          onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
          aria-label="Ordenar resultados"
          className={claseCampo}
        >
          <option value="recientes">Más recientes</option>
          <option value="precio-asc">Menor precio</option>
          <option value="precio-desc">Mayor precio</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
