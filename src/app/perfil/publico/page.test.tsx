import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PerfilPublicoPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerMiPerfil: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/perfiles", () => ({
  obtenerMiPerfil: mocks.obtenerMiPerfil,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

// El formulario client se prueba en su propio archivo; acá se aisla para
// enfocar la página en el prefill y el link "Ver mi perfil" (REQ-9/10).
vi.mock("@/components/perfil/formulario-perfil-publico", () => ({
  FormularioPerfilPublico: (props: {
    bio: string | null;
    businessName: string | null;
  }) => (
    <div
      data-testid="formulario-perfil-publico"
      data-bio={props.bio ?? ""}
      data-business-name={props.businessName ?? ""}
    />
  ),
}));

async function renderizarPagina() {
  const pagina = await PerfilPublicoPage();
  return render(pagina);
}

describe("Página /perfil/publico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });
  });

  it("redirige a sign-in cuando no hay sesión", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(renderizarPagina()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/sign-in?redirect=/perfil/publico"
    );
  });

  it("precarga bio y businessName del Profile existente y enlaza 'Ver mi perfil' (REQ-9/10)", async () => {
    mocks.obtenerMiPerfil.mockResolvedValue({
      bio: "Vendo maquinaria agrícola",
      businessName: "Agro Juan",
    });

    await renderizarPagina();

    const formulario = screen.getByTestId("formulario-perfil-publico");
    expect(formulario).toHaveAttribute("data-bio", "Vendo maquinaria agrícola");
    expect(formulario).toHaveAttribute("data-business-name", "Agro Juan");

    const verMiPerfil = screen.getByRole("link", { name: "Ver mi perfil" });
    expect(verMiPerfil).toHaveAttribute("href", "/vendedores/usuario-1");
  });

  it("precarga campos vacíos cuando el Profile aún no existe (lazy upsert, REQ-9)", async () => {
    mocks.obtenerMiPerfil.mockResolvedValue({ bio: null, businessName: null });

    await renderizarPagina();

    const formulario = screen.getByTestId("formulario-perfil-publico");
    expect(formulario).toHaveAttribute("data-bio", "");
    expect(formulario).toHaveAttribute("data-business-name", "");
    expect(
      screen.getByRole("link", { name: "Ver mi perfil" })
    ).toHaveAttribute("href", "/vendedores/usuario-1");
  });
});
