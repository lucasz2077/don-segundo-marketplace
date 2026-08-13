import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DetallePublicacionPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerPublicacionPorId: vi.fn(),
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
});
