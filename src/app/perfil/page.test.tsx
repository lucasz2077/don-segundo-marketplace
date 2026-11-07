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
  usePathname: () => "/perfil",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
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
    mocks.getSession.mockResolvedValue({
      user: { id: "usuario-1", name: "Juan Pérez", email: "juan@example.com" },
    });
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("VINCULADA");
  });

  it("redirige a sign-in cuando no hay sesión", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(renderizarPagina()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in?redirect=/perfil");
  });

  // Desde el rediseño (fase 5) /perfil es el índice de "Mi cuenta": cada
  // sección es una fila con etiqueta + descripción. La navegación lateral
  // repite las etiquetas solas, así que las filas se buscan por la descripción.

  it("enlaza la edición del perfil público y 'Ver mi perfil público' (REQ-10)", async () => {
    await renderizarPagina();

    const editar = screen.getByRole("link", { name: /Perfil público.*Bio y nombre comercial/ });
    expect(editar).toHaveAttribute("href", "/perfil/publico");

    const verMiPerfil = screen.getByRole("link", { name: "Ver mi perfil público" });
    expect(verMiPerfil).toHaveAttribute("href", "/vendedores/usuario-1");
  });

  it("saluda al usuario por su primer nombre y muestra su email", async () => {
    await renderizarPagina();

    expect(screen.getByText("Hola, Juan")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
  });

  it("lista las secciones de la cuenta en el índice", async () => {
    await renderizarPagina();

    expect(
      screen.getByRole("link", { name: /Información personal.*Nombre, DNI/ })
    ).toHaveAttribute("href", "/perfil/informacion");
    expect(
      screen.getByRole("link", { name: /Direcciones.*direcciones de entrega/ })
    ).toHaveAttribute("href", "/perfil/direcciones");
    expect(
      screen.getByRole("link", { name: /Mis publicaciones.*Stock/ })
    ).toHaveAttribute("href", "/perfil/publicaciones");
  });

  it("incluye la sección de verificación de vendedor (RF-32)", async () => {
    await renderizarPagina();

    const fila = screen.getByRole("link", { name: /Verificación de vendedor.*sello de vendedor verificado/ });
    expect(fila).toHaveAttribute("href", "/perfil/verificacion");
  });

  it("muestra el vínculo con Mercado Pago vinculado y la acción de re-vincular (RF-47)", async () => {
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("VINCULADA");

    await renderizarPagina();

    expect(screen.getByText("Mercado Pago vinculado")).toBeInTheDocument();
    expect(screen.getByText(/lista para cobrar tus ventas/)).toBeInTheDocument();

    const reVincular = screen.getByRole("link", { name: "Re-vincular" });
    expect(reVincular).toHaveAttribute("href", "/api/pagos/oauth/iniciar");
  });

  it("muestra el estado sin vínculo con el CTA de vincular (RF-47)", async () => {
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("SIN_VINCULO");

    await renderizarPagina();

    expect(
      screen.getByText("Vinculá tu cuenta de Mercado Pago para vender")
    ).toBeInTheDocument();

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
