import { describe, expect, it } from "vitest";
import {
  resolverDevolucionSchema,
  solicitarDevolucionSchema,
} from "@/lib/validation/pagos";

describe("solicitarDevolucionSchema", () => {
  it("acepta una solicitud válida", () => {
    const resultado = solicitarDevolucionSchema.safeParse({
      compraId: "123e4567-e89b-12d3-a456-426614174000",
      motivo: "El producto llegó en mal estado",
    });
    expect(resultado.success).toBe(true);
  });

  it("recorta el motivo al validar", () => {
    const resultado = solicitarDevolucionSchema.safeParse({
      compraId: "123e4567-e89b-12d3-a456-426614174000",
      motivo: "  El producto llegó en mal estado  ",
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.motivo).toBe("El producto llegó en mal estado");
    }
  });

  it("rechaza compraId que no es uuid", () => {
    const resultado = solicitarDevolucionSchema.safeParse({
      compraId: "compra-1",
      motivo: "El producto llegó en mal estado",
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza motivo con menos de 10 caracteres", () => {
    const resultado = solicitarDevolucionSchema.safeParse({
      compraId: "123e4567-e89b-12d3-a456-426614174000",
      motivo: "corto",
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza motivo de más de 500 caracteres", () => {
    const resultado = solicitarDevolucionSchema.safeParse({
      compraId: "123e4567-e89b-12d3-a456-426614174000",
      motivo: "x".repeat(501),
    });
    expect(resultado.success).toBe(false);
  });
});

describe("resolverDevolucionSchema", () => {
  it("acepta aprobar sin motivo de rechazo", () => {
    const resultado = resolverDevolucionSchema.safeParse({ accion: "aprobar" });
    expect(resultado.success).toBe(true);
  });

  it("acepta rechazar con motivo de rechazo", () => {
    const resultado = resolverDevolucionSchema.safeParse({
      accion: "rechazar",
      motivoRechazo: "El comprador no aportó pruebas",
    });
    expect(resultado.success).toBe(true);
  });

  it("rechaza accion inválida", () => {
    const resultado = resolverDevolucionSchema.safeParse({ accion: "reembolsar" });
    expect(resultado.success).toBe(false);
  });

  it("rechaza rechazar sin motivo (obligatorio al rechazar, RF-49)", () => {
    const resultado = resolverDevolucionSchema.safeParse({ accion: "rechazar" });
    expect(resultado.success).toBe(false);
  });

  it("rechaza motivo de rechazo de más de 500 caracteres", () => {
    const resultado = resolverDevolucionSchema.safeParse({
      accion: "rechazar",
      motivoRechazo: "x".repeat(501),
    });
    expect(resultado.success).toBe(false);
  });
});