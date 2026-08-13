import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PerfilPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

async function renderizarPagina() {
  const pagina = await PerfilPage();
  return render(pagina);
}

describe("Página /perfil", () => {
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
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in?redirect=/perfil");
  });

  it("muestra la card 'Perfil público' con edición y 'Ver mi perfil' (REQ-10)", async () => {
    await renderizarPagina();

    expect(
      screen.getByRole("heading", { name: "Perfil público" })
    ).toBeInTheDocument();

    const editar = screen.getByRole("link", { name: "Editar perfil" });
    expect(editar).toHaveAttribute("href", "/perfil/publico");

    const verMiPerfil = screen.getByRole("link", { name: "Ver mi perfil" });
    expect(verMiPerfil).toHaveAttribute("href", "/vendedores/usuario-1");
  });

  it("conserva las cards existentes del perfil", async () => {
    await renderizarPagina();

    expect(
      screen.getByRole("link", { name: /Información del perfil/ })
    ).toHaveAttribute("href", "/perfil/informacion");
    expect(
      screen.getByRole("link", { name: /Direcciones/ })
    ).toHaveAttribute("href", "/perfil/direcciones");
    expect(
      screen.getByRole("link", { name: /Mis publicaciones/ })
    ).toHaveAttribute("href", "/perfil/publicaciones");
  });
});
