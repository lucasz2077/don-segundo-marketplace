import { describe, expect, it } from "vitest";
import { etiquetasAccionModeracion } from "./etiquetas-reportes";

describe("etiquetasAccionModeracion", () => {
  it("cubre las cinco acciones de moderación con su etiqueta en español", () => {
    expect(etiquetasAccionModeracion).toEqual({
      REVIEWED: "Revisado",
      RESOLVED: "Resuelto",
      DISMISSED: "Descartado",
      PAUSED: "Publicación pausada",
      REJECTED: "Publicación rechazada",
    });
  });

  it("etiqueta cada acción con texto legible para el historial", () => {
    expect(etiquetasAccionModeracion.REVIEWED).toBe("Revisado");
    expect(etiquetasAccionModeracion.RESOLVED).toBe("Resuelto");
    expect(etiquetasAccionModeracion.DISMISSED).toBe("Descartado");
    expect(etiquetasAccionModeracion.PAUSED).toBe("Publicación pausada");
    expect(etiquetasAccionModeracion.REJECTED).toBe("Publicación rechazada");
  });
});
