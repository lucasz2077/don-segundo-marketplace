import { describe, expect, it } from "vitest";
import { contarFiltros, urlListados } from "./url-listados";

describe("urlListados", () => {
  it("sin filtros devuelve /listados", () => {
    expect(urlListados({})).toBe("/listados");
  });

  it("omite el orden por defecto y la página 1", () => {
    expect(urlListados({ orden: "recientes" }, { pagina: 1 })).toBe("/listados");
  });

  it("agrega un filtro conservando los demás y vuelve a la página 1", () => {
    expect(
      urlListados({ q: "tractor", orden: "precio-asc", pagina: 3 }, { provincia: "Córdoba" }),
    ).toBe("/listados?q=tractor&provincia=C%C3%B3rdoba&orden=precio-asc");
  });

  it("quita un filtro con null", () => {
    expect(urlListados({ q: "soja", condicion: "NEW" }, { condicion: null })).toBe(
      "/listados?q=soja",
    );
  });

  it("cambiar de página conserva los filtros", () => {
    expect(urlListados({ categoria: "abc", minPrecio: 100 }, { pagina: 2 })).toBe(
      "/listados?categoria=abc&minPrecio=100&pagina=2",
    );
  });
});

describe("contarFiltros", () => {
  it("cuenta categoría, condición, provincia y el rango de precio como uno", () => {
    expect(
      contarFiltros({ q: "x", categoria: "c", condicion: "USED", minPrecio: 1, maxPrecio: 9 }),
    ).toBe(3);
    expect(contarFiltros({ q: "x", orden: "precio-desc" })).toBe(0);
  });
});
