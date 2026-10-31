import { describe, expect, it } from "vitest";
import { paginasVisibles, SALTO } from "./paginacion";

describe("paginasVisibles", () => {
  it("sin páginas no muestra nada", () => {
    expect(paginasVisibles(1, 0)).toEqual([]);
  });

  it("con una sola página muestra solo la primera", () => {
    expect(paginasVisibles(1, 1)).toEqual([1]);
  });

  it("con pocas páginas las muestra todas sin saltos", () => {
    expect(paginasVisibles(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("en el medio muestra primera, vecinas de la actual y última con saltos", () => {
    expect(paginasVisibles(6, 20)).toEqual([1, SALTO, 5, 6, 7, SALTO, 20]);
  });

  it("al principio solo salta hacia el final", () => {
    expect(paginasVisibles(1, 20)).toEqual([1, 2, SALTO, 20]);
  });

  it("al final solo salta hacia el principio", () => {
    expect(paginasVisibles(20, 20)).toEqual([1, SALTO, 19, 20]);
  });

  it("muestra el número en lugar de un salto de una sola página", () => {
    expect(paginasVisibles(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
