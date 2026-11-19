import { describe, expect, it } from "vitest";

import { crearPublicacionSchema, MAXIMO_IMAGENES_PUBLICACION } from "./listing";

const imagen = (n: number) => ({
  url: `https://res.cloudinary.com/cuenta/image/upload/v1/don-segundo/u/${n}.jpg`,
  publicId: `don-segundo/u/${n}`,
});

const base = {
  title: "Tractor en buen estado",
  description: "Tractor con poco uso, listo para trabajar.",
  price: 1500000,
  currency: "ARS",
  condition: "USED",
  stock: 1,
  categoryId: "0b9c3c1e-5f2a-4e8b-9c1d-2a3b4c5d6e7f",
  province: "Santa Fe",
};

describe("crearPublicacionSchema — imágenes (RF-07, CA-02)", () => {
  it("el máximo es 6 imágenes", () => {
    expect(MAXIMO_IMAGENES_PUBLICACION).toBe(6);
  });

  it("acepta entre 1 y 6 imágenes", () => {
    expect(crearPublicacionSchema.safeParse({ ...base, imagenes: [imagen(1)] }).success).toBe(true);
    const seis = Array.from({ length: 6 }, (_, i) => imagen(i));
    expect(crearPublicacionSchema.safeParse({ ...base, imagenes: seis }).success).toBe(true);
  });

  it("rechaza una publicación sin imágenes", () => {
    for (const imagenes of [undefined, []]) {
      const resultado = crearPublicacionSchema.safeParse({ ...base, imagenes });
      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0]?.message).toBe("Subí al menos una imagen");
    }
  });

  it("rechaza más de 6 imágenes", () => {
    const siete = Array.from({ length: 7 }, (_, i) => imagen(i));
    const resultado = crearPublicacionSchema.safeParse({ ...base, imagenes: siete });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("Máximo 6 imágenes por publicación");
  });
});
