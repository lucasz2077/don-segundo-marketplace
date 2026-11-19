import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicarPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerCategoriasRaiz: vi.fn(),
  obtenerPublicacion: vi.fn(),
  puedePublicar: vi.fn(),
  obtenerCuentaMpVigente: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/categories", () => ({ obtenerCategoriasRaiz: mocks.obtenerCategoriasRaiz }));
vi.mock("@/lib/listings", () => ({
  obtenerPublicacion: mocks.obtenerPublicacion,
  puedePublicar: mocks.puedePublicar,
  esEditable: (p: { status: string; deletedAt: Date | null }) =>
    !p.deletedAt && (p.status === "ACTIVE" || p.status === "PAUSED"),
}));
vi.mock("@/lib/pagos/oauth", () => ({ obtenerCuentaMpVigente: mocks.obtenerCuentaMpVigente }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/publicar",
}));
// El formulario se prueba aparte: acá solo importa si se muestra o no.
vi.mock("@/components/listing/publicar-formulario", () => ({
  PublicarFormulario: () => <form aria-label="Formulario de publicación" />,
}));

async function renderizar(query: Record<string, string> = {}) {
  const pagina = await PublicarPage({ searchParams: Promise.resolve(query) });
  return render(pagina);
}

const publicacion = (status: string) => ({
  id: "lista-1",
  ownerId: "vendedor-1",
  title: "Tractor",
  description: "Tractor con poco uso",
  price: { toString: () => "1000" },
  currency: "ARS",
  condition: "USED",
  stock: 1,
  categoryId: "cat-1",
  province: "Santa Fe",
  city: null,
  status,
  deletedAt: status === "REJECTED" ? new Date() : null,
  images: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "vendedor-1" } });
  mocks.obtenerCategoriasRaiz.mockResolvedValue([]);
  mocks.puedePublicar.mockResolvedValue(true);
  mocks.obtenerCuentaMpVigente.mockResolvedValue({ id: "mp-1" });
});

describe("Página /publicar", () => {
  it("muestra el formulario a una cuenta vendedora con MP vinculado", async () => {
    await renderizar();

    expect(screen.getByRole("form", { name: "Formulario de publicación" })).toBeInTheDocument();
  });

  it("a una cuenta solo compradora le ofrece cambiar el tipo de cuenta en lugar del formulario (RF-07)", async () => {
    mocks.puedePublicar.mockResolvedValue(false);
    mocks.obtenerCuentaMpVigente.mockResolvedValue(null);

    await renderizar();

    expect(screen.getByText("Tu cuenta es solo de comprador")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cambiar tipo de cuenta" })).toHaveAttribute(
      "href",
      "/perfil/informacion"
    );
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    // El aviso de Mercado Pago no se suma al de tipo de cuenta.
    expect(screen.queryByText(/Vinculá tu cuenta de Mercado Pago/)).not.toBeInTheDocument();
  });

  it.each(["SOLD", "REJECTED"])("no ofrece editar una publicación %s (RF-08)", async (status) => {
    mocks.obtenerPublicacion.mockResolvedValue(publicacion(status));

    await renderizar({ id: "lista-1" });

    expect(screen.getByText("Esta publicación ya no se puede editar")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("permite editar una publicación pausada", async () => {
    mocks.obtenerPublicacion.mockResolvedValue(publicacion("PAUSED"));

    await renderizar({ id: "lista-1" });

    expect(screen.getByRole("form", { name: "Formulario de publicación" })).toBeInTheDocument();
  });
});
