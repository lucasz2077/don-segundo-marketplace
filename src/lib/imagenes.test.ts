import { afterEach, describe, expect, it, vi } from "vitest";
import { generarIdPublicoImagen, imagenPerteneceAUsuario } from "@/lib/imagenes";

const urlDe = (publicId: string, cuenta = "don-segundo-cloud") =>
  `https://res.cloudinary.com/${cuenta}/image/upload/v1700000000/${publicId}.jpg`;

describe("generarIdPublicoImagen", () => {
  it("antepone el id del usuario a un uuid", () => {
    expect(generarIdPublicoImagen("u1")).toMatch(/^u1\/[0-9a-f-]{36}$/);
  });
});

describe("imagenPerteneceAUsuario", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("acepta una imagen subida por el usuario (con o sin carpeta de la marca)", () => {
    for (const publicId of ["don-segundo/u1/abc", "u1/abc"]) {
      expect(imagenPerteneceAUsuario({ publicId, url: urlDe(publicId) }, "u1")).toBe(true);
    }
  });

  it("rechaza imágenes de otro usuario o sin dueño (anteriores a la regla)", () => {
    for (const publicId of ["don-segundo/u2/abc", "don-segundo/abc", "abc"]) {
      expect(imagenPerteneceAUsuario({ publicId, url: urlDe(publicId) }, "u1")).toBe(false);
    }
  });

  it("rechaza URLs que no son de Cloudinary por https o que no apuntan al publicId", () => {
    const publicId = "don-segundo/u1/abc";
    const urls = [
      "https://evil.example.com/don-segundo/u1/abc.jpg",
      "http://res.cloudinary.com/x/image/upload/don-segundo/u1/abc.jpg",
      urlDe("don-segundo/u1/otra"),
      "no-es-una-url",
    ];
    for (const url of urls) {
      expect(imagenPerteneceAUsuario({ publicId, url }, "u1")).toBe(false);
    }
  });

  it("exige la cuenta de Cloudinary configurada cuando se conoce", () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "don-segundo-cloud");
    const publicId = "don-segundo/u1/abc";

    expect(imagenPerteneceAUsuario({ publicId, url: urlDe(publicId) }, "u1")).toBe(true);
    expect(
      imagenPerteneceAUsuario({ publicId, url: urlDe(publicId, "otra-cuenta") }, "u1")
    ).toBe(false);
  });
});
