import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DetallePublicacionPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerPublicacionPorId: vi.fn(),
  obtenerResenasDePublicacion: vi.fn(),
  esFavorito: vi.fn(),
  notFound: vi.fn(),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/listings", () => ({
  obtenerPublicacionPorId: mocks.obtenerPublicacionPorId,
}));

vi.mock("@/lib/ratings", () => ({
  obtenerResenasDePublicacion: mocks.obtenerResenasDePublicacion,
}));

vi.mock("@/lib/favoritos", () => ({
  esFavorito: mocks.esFavorito,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  usePathname: mocks.usePathname,
  useRouter: mocks.useRouter,
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

const publicacionActiva = {
  id: "lista-1",
  title: "Tractor John Deere",
  description: "En perfecto estado",
  price: { toString: () => "1500000" },
  currency: "ARS",
  condition: "USED",
  stock: 2,
  status: "ACTIVE",
  province: "Santa Fe",
  city: null,
  viewCount: 10,
  category: { slug: "maquinaria", name: "Maquinaria" },
  images: [{ url: "https://img.example/tractor.jpg", alt: "Tractor" }],
  owner: {
    id: "owner-1",
    name: "Juan Pérez",
    profile: { bio: "Vendo maquinaria", businessName: "Agro Juan" },
  },
};

async function renderizarPagina(id = "lista-1") {
  const pagina = await DetallePublicacionPage({
    params: Promise.resolve({ id }),
  });
  return render(pagina);
}

describe("Detalle de publicación /listados/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.usePathname.mockReturnValue("/listados/lista-1");
    mocks.useRouter.mockReturnValue({ push: vi.fn(), refresh: vi.fn() });
    mocks.getSession.mockResolvedValue({ user: { id: "comprador-1" } });
    mocks.esFavorito.mockResolvedValue(false);
    mocks.obtenerResenasDePublicacion.mockResolvedValue([]);
  });

  it("enlaza el nombre del vendedor a su perfil público y muestra el businessName (REQ-7)", async () => {
    mocks.obtenerPublicacionPorId.mockResolvedValue(publicacionActiva);

    await renderizarPagina();

    const enlace = screen.getByRole("link", { name: "Juan Pérez" });
    expect(enlace).toHaveAttribute("href", "/vendedores/owner-1");
    expect(screen.getByText("Agro Juan")).toBeInTheDocument();
  });

  it("mantiene el enlace al perfil aunque el vendedor no tenga businessName", async () => {
    mocks.obtenerPublicacionPorId.mockResolvedValue({
      ...publicacionActiva,
      owner: { id: "owner-1", name: "Juan Pérez", profile: null },
    });

    await renderizarPagina();

    expect(
      screen.getByRole("link", { name: "Juan Pérez" })
    ).toHaveAttribute("href", "/vendedores/owner-1");
    expect(screen.queryByText("Agro Juan")).not.toBeInTheDocument();
  });

  it("responde 404 cuando la publicación no existe", async () => {
    mocks.obtenerPublicacionPorId.mockResolvedValue(null);

    await expect(renderizarPagina("inexistente")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("muestra el bloque de reseñas con autor y comentario (RF-30)", async () => {
    mocks.obtenerPublicacionPorId.mockResolvedValue(publicacionActiva);
    mocks.obtenerResenasDePublicacion.mockResolvedValue([
      {
        id: "rating-1",
        puntaje: 5,
        comentario: "Excelente trato, volvería a comprar",
        autor: "Ana García",
        autorId: "comprador-1",
        fecha: new Date("2026-08-01T00:00:00Z"),
      },
      {
        id: "rating-2",
        puntaje: 3,
        comentario: null,
        autor: "María López",
        autorId: "otro-usuario",
        fecha: new Date("2026-07-15T00:00:00Z"),
      },
    ]);

    await renderizarPagina();

    expect(
      screen.getByRole("heading", {
        name: "Reseñas de esta publicación",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(
      screen.getByText("Excelente trato, volvería a comprar")
    ).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    // Solo el autor de su propia reseña ve el botón de eliminación (RF-31).
    expect(screen.getByRole("button", { name: "Eliminar reseña" })).toBeVisible();
  });

  it("no muestra el bloque de reseñas cuando no hay reseñas", async () => {
    mocks.obtenerPublicacionPorId.mockResolvedValue(publicacionActiva);

    await renderizarPagina();

    expect(
      screen.queryByRole("heading", {
        name: "Reseñas de esta publicación",
      })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar reseña")).not.toBeInTheDocument();
  });

  it("muestra el sello Verificado en la card Vendedor cuando el dueño está VERIFIED (RF-34)", async () => {
    mocks.obtenerPublicacionPorId.mockResolvedValue({
      ...publicacionActiva,
      owner: {
        id: "owner-1",
        name: "Juan Pérez",
        profile: { bio: null, businessName: null, sellerVerified: "VERIFIED" },
      },
    });

    await renderizarPagina();

    expect(screen.getByText("Verificado")).toBeInTheDocument();
  });

  it("no muestra el sello cuando el dueño no está VERIFIED (RF-34)", async () => {
    mocks.obtenerPublicacionPorId.mockResolvedValue({
      ...publicacionActiva,
      owner: {
        id: "owner-1",
        name: "Juan Pérez",
        profile: { bio: null, businessName: null, sellerVerified: "NONE" },
      },
    });

    await renderizarPagina();

    expect(screen.queryByText("Verificado")).not.toBeInTheDocument();
  });

  it("no muestra el sello cuando el dueño no tiene Profile (RF-34)", async () => {
    mocks.obtenerPublicacionPorId.mockResolvedValue({
      ...publicacionActiva,
      owner: { id: "owner-1", name: "Juan Pérez", profile: null },
    });

    await renderizarPagina();

    expect(screen.queryByText("Verificado")).not.toBeInTheDocument();
  });
});
