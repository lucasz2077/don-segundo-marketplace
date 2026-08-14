import { describe, expect, it } from "vitest";
import { actualizarPerfilPublicoSchema } from "./perfil";

describe("actualizarPerfilPublicoSchema", () => {
  it("acepta bio y businessName válidos", () => {
    const resultado = actualizarPerfilPublicoSchema.safeParse({
      bio: "Vendo maquinaria agrícola usada",
      businessName: "Agro Juan",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data).toEqual({
        bio: "Vendo maquinaria agrícola usada",
        businessName: "Agro Juan",
      });
    }
  });

  it("rechaza una bio que excede los 500 caracteres", () => {
    const resultado = actualizarPerfilPublicoSchema.safeParse({
      bio: "a".repeat(501),
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe(
        "La bio es demasiado larga"
      );
    }
  });

  it("rechaza un businessName que excede los 80 caracteres", () => {
    const resultado = actualizarPerfilPublicoSchema.safeParse({
      businessName: "b".repeat(81),
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe(
        "El nombre comercial es demasiado largo"
      );
    }
  });

  it("convierte campos en blanco a null", () => {
    const resultado = actualizarPerfilPublicoSchema.safeParse({
      bio: "   ",
      businessName: "",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.bio).toBeNull();
      expect(resultado.data.businessName).toBeNull();
    }
  });

  it("rechaza un body que intente fijar el userId (REQ-9 propiedad)", () => {
    const resultado = actualizarPerfilPublicoSchema.safeParse({
      bio: "Bio",
      userId: "usuario-ajeno",
    });

    expect(resultado.success).toBe(false);
  });
});