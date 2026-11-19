import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  obtenerPublicacion: vi.fn(),
  obtenerPublicacionesParaSitemap: vi.fn(),
  obtenerCategoriasRaiz: vi.fn(),
}));

vi.mock("@/lib/listings", () => ({
  obtenerPublicacion: mocks.obtenerPublicacion,
  obtenerPublicacionPorId: vi.fn(),
  obtenerPublicacionesActivas: vi.fn(),
  obtenerPublicacionesParaSitemap: mocks.obtenerPublicacionesParaSitemap,
}));
vi.mock("@/lib/categories", () => ({ obtenerCategoriasRaiz: mocks.obtenerCategoriasRaiz }));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/favoritos", () => ({ esFavorito: vi.fn() }));
vi.mock("@/lib/ratings", () => ({ obtenerResenasDePublicacion: vi.fn() }));

import { generateMetadata } from "./listados/[id]/page";
import robots from "./robots";
import sitemap from "./sitemap";

const publicacion = {
  id: "lista-1",
  title: "Tractor John Deere 5090E",
  description: "Muy buen estado, 3.200 horas, cubiertas nuevas.",
  price: { toString: () => "1500000.50" },
  currency: "ARS",
  status: "ACTIVE",
  city: "Pergamino",
  province: "Buenos Aires",
  images: [{ url: "https://res.cloudinary.com/c/image/upload/v1/don-segundo/u/t.jpg", alt: null }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://donsegundo.com.ar");
});

describe("Vista previa de una publicación (RNF-12)", () => {
  it("incluye precio, ubicación y la foto recortada para compartir", async () => {
    mocks.obtenerPublicacion.mockResolvedValue(publicacion);

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "lista-1" }) });

    expect(metadata.title).toBe("Tractor John Deere 5090E");
    expect(metadata.description).toMatch(/^\$ 1\.500\.000,50 · Pergamino, Buenos Aires\. Muy buen estado/);
    expect(metadata.alternates?.canonical).toBe("/listados/lista-1");
    const imagenes = metadata.openGraph?.images as Array<{ url: string; width: number }>;
    expect(imagenes[0].url).toContain("/image/upload/c_fill,w_1200,h_630");
    expect(imagenes[0].width).toBe(1200);
  });

  it("una publicación no activa no se indexa", async () => {
    mocks.obtenerPublicacion.mockResolvedValue({ ...publicacion, status: "PAUSED" });

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "lista-1" }) });

    expect(metadata.robots).toEqual({ index: false });
  });
});

describe("sitemap y robots", () => {
  it("lista inicio, categorías (con subcategorías) y publicaciones activas", async () => {
    mocks.obtenerCategoriasRaiz.mockResolvedValue([
      { slug: "maquinaria-agricola", children: [{ slug: "tractores" }] },
    ]);
    mocks.obtenerPublicacionesParaSitemap.mockResolvedValue([
      { id: "lista-1", updatedAt: new Date("2026-11-01T00:00:00Z") },
    ]);

    const urls = (await sitemap()).map((entrada) => entrada.url);

    expect(urls).toEqual([
      "https://donsegundo.com.ar/",
      "https://donsegundo.com.ar/listados",
      "https://donsegundo.com.ar/categorias/maquinaria-agricola",
      "https://donsegundo.com.ar/categorias/tractores",
      "https://donsegundo.com.ar/listados/lista-1",
    ]);
  });

  it("si la base falla, devuelve al menos las páginas fijas", async () => {
    mocks.obtenerCategoriasRaiz.mockRejectedValue(new Error("base caída"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await sitemap()).length).toBe(2);
  });

  it("robots bloquea las páginas privadas y apunta al sitemap", () => {
    const resultado = robots();
    const reglas = Array.isArray(resultado.rules) ? resultado.rules[0] : resultado.rules;

    expect(reglas.disallow).toEqual(expect.arrayContaining(["/api/", "/perfil", "/admin", "/compras"]));
    expect(resultado.sitemap).toBe("https://donsegundo.com.ar/sitemap.xml");
  });
});
