import { describe, expect, it } from "vitest";

import { DESTINO_POR_DEFECTO, destinoSeguro } from "./destino-seguro";

describe("destinoSeguro (redirección abierta en /sign-in)", () => {
  it.each(["/compras", "/listados/abc-123", "/listados?q=tractor&page=2", "/"])(
    "acepta la ruta interna %s",
    (ruta) => {
      expect(destinoSeguro(ruta)).toBe(ruta);
    }
  );

  it.each([
    "https://sitio-malo.com",
    "http://sitio-malo.com/compras",
    "//sitio-malo.com",
    "/\\sitio-malo.com",
    "/\\/sitio-malo.com",
    "/compras\\..\\sitio",
    "javascript:alert(1)",
    "/\t/sitio-malo.com",
    " /compras",
    "compras",
  ])("rechaza %j y usa el destino por defecto", (valor) => {
    expect(destinoSeguro(valor)).toBe(DESTINO_POR_DEFECTO);
  });

  it("usa el destino por defecto sin valor o con valores repetidos", () => {
    expect(destinoSeguro(undefined)).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro(null)).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro("")).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro(["/compras", "/favoritos"])).toBe(DESTINO_POR_DEFECTO);
  });
});
