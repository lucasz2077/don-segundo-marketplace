import { afterEach, describe, expect, it, vi } from "vitest";

import { descripcionCorta, urlImagenCompartir, urlSitio } from "./seo";

describe("seo", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("urlSitio quita la barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://donsegundo.com.ar/");
    expect(urlSitio()).toBe("https://donsegundo.com.ar");
  });

  it("recorta las imágenes de Cloudinary a 1200x630 para compartir", () => {
    expect(
      urlImagenCompartir("https://res.cloudinary.com/cuenta/image/upload/v1/don-segundo/u/foto.png")
    ).toBe(
      "https://res.cloudinary.com/cuenta/image/upload/c_fill,w_1200,h_630,g_auto,f_jpg,q_auto/v1/don-segundo/u/foto.png"
    );
  });

  it("deja igual las URLs que no son de Cloudinary o son inválidas", () => {
    expect(urlImagenCompartir("https://ejemplo.com/foto.jpg")).toBe("https://ejemplo.com/foto.jpg");
    expect(urlImagenCompartir("no-es-url")).toBe("no-es-url");
  });

  it("descripcionCorta no corta palabras y agrega puntos suspensivos", () => {
    const texto = "Tractor John Deere 5090E en excelente estado ".repeat(10);
    const corta = descripcionCorta(texto);
    expect(corta.length).toBeLessThanOrEqual(160);
    expect(corta.endsWith("…")).toBe(true);
    expect(descripcionCorta("  Corto   y   claro ")).toBe("Corto y claro");
  });
});
