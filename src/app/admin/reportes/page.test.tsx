import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminReportesPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerReportes: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/reportes", () => ({
  obtenerReportes: mocks.obtenerReportes,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/components/reportes/acciones-reporte", () => ({
  AccionesReporte: () => <div data-testid="acciones-reporte" />,
}));

const reportes = [
  {
    id: "rep-1",
    status: "OPEN",
    reason: "FRAUD",
    createdAt: new Date("2026-08-10T12:00:00Z"),
    details: "Precio sospechoso",
    listing: { id: "lista-1", title: "Tractor John Deere", status: "ACTIVE" },
    reporter: { id: "usuario-2", name: "Ana García" },
  },
  {
    id: "rep-2",
    status: "REVIEWED",
    reason: "SPAM",
    createdAt: new Date("2026-08-11T12:00:00Z"),
    details: null,
    listing: {
      id: "lista-2",
      title: "Sembradora de precisión",
      status: "PAUSED",
    },
    reporter: { id: "usuario-3", name: "María López" },
  },
];

const resultadoPorDefecto = {
  reportes,
  total: reportes.length,
  pagina: 1,
  tamanioPagina: 20,
  totalPaginas: 1,
};

async function renderizarPagina(searchParams: Record<string, string> = {}) {
  const pagina = await AdminReportesPage({
    searchParams: Promise.resolve(searchParams),
  });
  return render(pagina);
}

describe("Panel de reportes /admin/reportes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.obtenerReportes.mockResolvedValue(resultadoPorDefecto);
  });

  it("filtra por motivo y estado combinados cuando ambos están en la URL (spec: filtro combinado)", async () => {
    await renderizarPagina({ estado: "OPEN", motivo: "FRAUD" });

    expect(mocks.obtenerReportes).toHaveBeenCalledWith(
      "admin-1",
      expect.objectContaining({ estado: "OPEN", motivo: "FRAUD" })
    );
  });

  it("pasa el motivo solo cuando no hay estado", async () => {
    await renderizarPagina({ motivo: "SPAM" });

    expect(mocks.obtenerReportes).toHaveBeenCalledWith("admin-1", {
      estado: undefined,
      motivo: "SPAM",
      pagina: 1,
    });
  });

  it("ignora un motivo inválido en la URL y lista sin filtrar", async () => {
    await renderizarPagina({ motivo: "HACK" });

    expect(mocks.obtenerReportes).toHaveBeenCalledWith("admin-1", {
      estado: undefined,
      motivo: undefined,
      pagina: 1,
    });
    expect(screen.getByText("Tractor John Deere")).toBeInTheDocument();
    expect(screen.getByText("Sembradora de precisión")).toBeInTheDocument();
  });

  it("enlaza cada fila al detalle del reporte", async () => {
    await renderizarPagina();

    const enlacesDetalle = screen.getAllByRole("link", { name: "Ver detalle" });
    expect(enlacesDetalle).toHaveLength(2);
    expect(enlacesDetalle[0]).toHaveAttribute("href", "/admin/reportes/rep-1");
    expect(enlacesDetalle[1]).toHaveAttribute("href", "/admin/reportes/rep-2");
  });

  it("muestra los filtros de motivo con sus etiquetas y marca el activo", async () => {
    await renderizarPagina({ motivo: "FRAUD" });

    expect(screen.getByRole("link", { name: "Es spam" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Contenido inapropiado" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Fraude o estafa" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Publicación duplicada" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Otro" })).toBeInTheDocument();
  });

  it("combina ambos filtros en los enlaces de los chips", async () => {
    await renderizarPagina({ estado: "OPEN", motivo: "FRAUD" });

    expect(screen.getByRole("link", { name: "Abierto" })).toHaveAttribute(
      "href",
      "/admin/reportes?estado=OPEN&motivo=FRAUD"
    );
    expect(screen.getByRole("link", { name: "Es spam" })).toHaveAttribute(
      "href",
      "/admin/reportes?estado=OPEN&motivo=SPAM"
    );
  });

  it("el chip Todos de cada grupo limpia solo su filtro y conserva el otro", async () => {
    await renderizarPagina({ estado: "OPEN", motivo: "FRAUD" });

    const grupoEstado = screen.getByRole("group", {
      name: "Filtrar reportes por estado",
    });
    expect(
      within(grupoEstado).getByRole("link", { name: "Todos" })
    ).toHaveAttribute("href", "/admin/reportes?motivo=FRAUD");

    const grupoMotivo = screen.getByRole("group", {
      name: "Filtrar reportes por motivo",
    });
    expect(
      within(grupoMotivo).getByRole("link", { name: "Todos" })
    ).toHaveAttribute("href", "/admin/reportes?estado=OPEN");
  });

  it("conserva estado y motivo en los enlaces de paginación", async () => {
    mocks.obtenerReportes.mockResolvedValue({
      ...resultadoPorDefecto,
      totalPaginas: 3,
    });

    await renderizarPagina({ estado: "OPEN", motivo: "FRAUD" });

    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute(
      "href",
      "/admin/reportes?estado=OPEN&motivo=FRAUD&pagina=2"
    );
  });

  it("redirige a sign-in cuando no hay sesión", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(renderizarPagina()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("redirige a / cuando el usuario no es admin", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1", role: "USER" } });

    await expect(renderizarPagina()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("muestra el estado vacío cuando no hay reportes", async () => {
    mocks.obtenerReportes.mockResolvedValue({
      reportes: [],
      total: 0,
      pagina: 1,
      tamanioPagina: 20,
      totalPaginas: 1,
    });

    await renderizarPagina();

    expect(
      screen.getByText("No hay reportes para mostrar por ahora.")
    ).toBeInTheDocument();
  });
});
