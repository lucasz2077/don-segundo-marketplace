import { describe, expect, it } from "vitest";
import { inicialesDe } from "./avatar";

describe("inicialesDe", () => {
  it("toma hasta dos iniciales en mayúscula", () => {
    expect(inicialesDe("juan pérez gómez")).toBe("JP");
  });

  it("funciona con un solo nombre y espacios extra", () => {
    expect(inicialesDe("  Ñandú ")).toBe("Ñ");
  });

  it("devuelve ? si el nombre está vacío", () => {
    expect(inicialesDe("   ")).toBe("?");
  });
});
