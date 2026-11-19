import { render, screen, within } from "@testing-library/react";
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
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

async function renderizarPagina(query: { mp?: string } = {}) {
  const pagina = await PerfilPage({ searchParams: Promise.resolve(query) });
  return render(pagina);
}

/**
 * El índice de /perfil agrupa las secciones en tarjetas con un h2 por grupo.
 * La navegación lateral (desktop) repite los mismos enlaces, así que las
 * consultas se acotan a la tarjeta del grupo.
 */
function grupoDelIndice(titulo: string) {
  const encabezado = screen.getByRole("heading", { level: 2, name: titulo });
  const seccion = encabezado.closest("section");
  if (!seccion) throw new Error(`No se encontró la sección del grupo ${titulo}`);
  return within(seccion);
}

describe("Página /perfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.getSession.mockResolvedValue({
      user: { id: "usuario-1", name: "Ana Pérez", email: "ana@example.com", image: null },
    });
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("VINCULADA");
  });

  it("redirige a sign-in cuando no hay sesión", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(renderizarPagina()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in?redirect=/perfil");
  });

  it("muestra el acceso a 'Perfil público' y el enlace 'Ver mi perfil público' (REQ-10)", async () => {
    await renderizarPagina();

    const misDatos = grupoDelIndice("Mis datos");
    expect(
      misDatos.getByRole("link", { name: /Perfil público/ })
    ).toHaveAttribute("href", "/perfil/publico");

    const verMiPerfil = screen.getByRole("link", { name: "Ver mi perfil público" });
    expect(verMiPerfil).toHaveAttribute("href", "/vendedores/usuario-1");
  });

  it("conserva las secciones existentes del perfil", async () => {
    await renderizarPagina();

    const misDatos = grupoDelIndice("Mis datos");
    expect(
      misDatos.getByRole("link", { name: /Información personal/ })
    ).toHaveAttribute("href", "/perfil/informacion");
    expect(
      misDatos.getByRole("link", { name: /Direcciones/ })
    ).toHaveAttribute("href", "/perfil/direcciones");
    expect(
      grupoDelIndice("Ventas").getByRole("link", { name: /Mis publicaciones/ })
    ).toHaveAttribute("href", "/perfil/publicaciones");
  });

  it("incluye la sección de verificación de vendedor (RF-32)", async () => {
    await renderizarPagina();

    const ventas = grupoDelIndice("Ventas");
    const enlace = ventas.getByRole("link", { name: /Verificación de vendedor/ });
    expect(enlace).toHaveAttribute("href", "/perfil/verificacion");
    expect(ventas.getByText(/sello de vendedor verificado/)).toBeInTheDocument();
  });

  it("muestra la navegación de la cuenta con el resumen como página actual", async () => {
    await renderizarPagina();

    const nav = within(screen.getByRole("navigation", { name: "Mi cuenta" }));
    expect(nav.getByRole("link", { name: "Resumen" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "Mis compras" })).not.toHaveAttribute("aria-current");
  });

  it("muestra el vínculo con Mercado Pago vinculada y la acción de re-vincular (RF-47)", async () => {
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("VINCULADA");

    await renderizarPagina();

    expect(screen.getByText("Mercado Pago vinculado")).toBeInTheDocument();
    expect(screen.getByText(/está lista para cobrar tus ventas/)).toBeInTheDocument();

    const reVincular = screen.getByRole("link", { name: "Re-vincular" });
    expect(reVincular).toHaveAttribute("href", "/api/pagos/oauth/iniciar");
  });

  it("muestra el estado sin vínculo con el CTA de vincular (RF-47)", async () => {
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("SIN_VINCULO");

    await renderizarPagina();

    expect(
      screen.getByText("Vinculá tu cuenta de Mercado Pago para vender")
    ).toBeInTheDocument();
    expect(screen.getByText(/Es el requisito para publicar/)).toBeInTheDocument();

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

  it("al volver de MP con la vinculación hecha confirma el resultado (RF-48)", async () => {
    await renderizarPagina({ mp: "vinculada" });

    expect(
      screen.getByText("¡Listo! Vinculaste tu cuenta de Mercado Pago")
    ).toBeInTheDocument();
  });

  it("al volver de MP con un error lo avisa en lugar de callar (RF-48)", async () => {
    mocks.obtenerEstadoVinculacionMp.mockResolvedValue("SIN_VINCULO");

    await renderizarPagina({ mp: "error" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos vincular tu cuenta de Mercado Pago"
    );
  });
});
