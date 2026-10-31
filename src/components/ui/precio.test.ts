import { describe, expect, it } from "vitest";
import { partesPrecio } from "./precio";

describe("partesPrecio", () => {
  it("formatea miles con punto y omite centavos en cero", () => {
    expect(partesPrecio("1200000.00")).toEqual({ entero: "1.200.000", centavos: null });
  });

  it("conserva los centavos de un Decimal sin pasar por float", () => {
    expect(partesPrecio("15000.5")).toEqual({ entero: "15.000", centavos: "50" });
    expect(partesPrecio("9999999999.99")).toEqual({
      entero: "9.999.999.999",
      centavos: "99",
    });
  });

  it("acepta números", () => {
    expect(partesPrecio(850)).toEqual({ entero: "850", centavos: null });
  });
});
