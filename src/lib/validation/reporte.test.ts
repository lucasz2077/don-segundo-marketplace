import { describe, expect, it } from "vitest";
import { accionModeracionSchema } from "./reporte";

const reporteIdValido = "00000000-0000-4000-8000-000000000001";

describe("accionModeracionSchema", () => {
  it("acepta pausar una publicación con un reporte válido", () => {
    const result = accionModeracionSchema.safeParse({
      accion: "PAUSED",
      reporteId: reporteIdValido,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        accion: "PAUSED",
        reporteId: reporteIdValido,
      });
    }
  });

  it("acepta rechazar una publicación con un reporte válido", () => {
    const result = accionModeracionSchema.safeParse({
      accion: "REJECTED",
      reporteId: reporteIdValido,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        accion: "REJECTED",
        reporteId: reporteIdValido,
      });
    }
  });

  it("rechaza una acción que no es pausar ni rechazar", () => {
    const result = accionModeracionSchema.safeParse({
      accion: "RESOLVED",
      reporteId: reporteIdValido,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("La acción no es válida");
    }
  });

  it("rechaza un reporteId que no es un UUID", () => {
    const result = accionModeracionSchema.safeParse({
      accion: "PAUSED",
      reporteId: "no-es-un-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Selecciona un reporte válido"
      );
    }
  });

  it("rechaza un cuerpo incompleto sin reporteId", () => {
    const result = accionModeracionSchema.safeParse({ accion: "PAUSED" });

    expect(result.success).toBe(false);
  });
});
