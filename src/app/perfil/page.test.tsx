import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PerfilPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
  obtenerEstadoVinculacionMp: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/pagos/oauth", () => ({
  obtenerEstadoVinculacionMp: mocks.obtenerEstadoVinculacionMp,
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
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("VINCULADA");
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

  it("incluye la card de verificación de vendedor (RF-32)", async () => {
    await renderizarPagina();

    const card = screen.getByRole("link", { name: /Verificación de vendedor/ });
    expect(card).toHaveAttribute("href", "/perfil/verificacion");
    expect(screen.getByText(/Estado de tu verificación/)).toBeInTheDocument();
  });

  it("muestra el vínculo con Mercado Pago vinculada y la acción de re-vincular (RF-47)", async () => {
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("VINCULADA");

    await renderizarPagina();

    expect(
      screen.getByRole("heading", { name: "Mercado Pago" })
    ).toBeInTheDocument();
    expect(screen.getByText(/está vinculada/)).toBeInTheDocument();

    const reVincular = screen.getByRole("link", { name: "Re-vincular" });
    expect(reVincular).toHaveAttribute("href", "/api/pagos/oauth/iniciar");
  });

  it("muestra el estado sin vínculo con el CTA de vincular (RF-47)", async () => {
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("SIN_VINCULO");

    await renderizarPagina();

    expect(screen.getByText(/necesitás vincular tu cuenta de Mercado Pago/)).toBeInTheDocument();

    const vincular = screen.getByRole("link", { name: "Vincular Mercado Pago" });
    expect(vincular).toHaveAttribute("href", "/api/pagos/oauth/iniciar");
  });

  it("muestra el vínculo revocado con el CTA de re-vincular (RF-48)", async () => {
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("REVOCADA");

    await renderizarPagina();

    expect(screen.getByText(/vínculo con Mercado Pago fue revocado/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Re-vincular" })
    ).toHaveAttribute("href", "/api/pagos/oauth/iniciar");
  });
});
