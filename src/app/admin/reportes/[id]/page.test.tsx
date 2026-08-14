import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReporteNoEncontradoError } from "@/lib/reportes";
import DetalleReportePage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerReporteDetalle: vi.fn(),
  listarAcciones: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

// Se preservan las clases de error reales del service (la página usa
// `instanceof`): solo se reemplazan las funciones de consulta.
vi.mock("@/lib/reportes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reportes")>();
  return {
    ...actual,
    obtenerReporteDetalle: mocks.obtenerReporteDetalle,
    listarAcciones: mocks.listarAcciones,
  };
});

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

// El foco de esta prueba es la página server: el componente de acciones
// (client) se aísla con un stub que expone las props recibidas.
vi.mock("@/components/reportes/acciones-reporte", () => ({
  AccionesReporte: (props: {
    reporteId: string;
    listingId: string;
    estado: string;
    mostrarAccionesPublicacion?: boolean;
  }) => (
    <div
      data-testid="acciones-reporte"
      data-reporte={props.reporteId}
      data-listing={props.listingId}
      data-estado={props.estado}
      data-mostrar={String(props.mostrarAccionesPublicacion)}
    />
  ),
}));

const reporteDetalle = {
  id: "rep-1",
  status: "REVIEWED",
  reason: "FRAUD",
  createdAt: new Date("2026-08-10T12:00:00Z"),
  details: "Precio sospechoso para un tractor 2020",
  listing: {
    id: "lista-1",
    title: "Tractor John Deere",
    status: "ACTIVE",
    owner: { id: "dueño-1", name: "Juan Pérez", image: null },
  },
  reporter: { id: "usuario-2", name: "Ana García", image: null },
};

const acciones = [
  {
    id: "acc-1",
    reportId: "rep-1",
    adminId: "admin-1",
    accion: "REVIEWED",
    detalles: null,
    createdAt: new Date("2026-08-11T10:00:00Z"),
    admin: { id: "admin-1", name: "Carlos Moderador", image: null },
  },
  {
    id: "acc-2",
    reportId: "rep-1",
    adminId: "admin-1",
    accion: "RESOLVED",
    detalles: null,
    createdAt: new Date("2026-08-11T14:30:00Z"),
    admin: { id: "admin-1", name: "Carlos Moderador", image: null },
  },
];

async function renderizarPagina(id = "rep-1") {
  const pagina = await DetalleReportePage({ params: Promise.resolve({ id }) });
  return render(pagina);
}

describe("Detalle del reporte /admin/reportes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.obtenerReporteDetalle.mockResolvedValue(reporteDetalle);
    mocks.listarAcciones.mockResolvedValue(acciones);
  });

  it("consulta el detalle y las acciones con el id del params y el admin", async () => {
    await renderizarPagina("rep-1");

    expect(mocks.obtenerReporteDetalle).toHaveBeenCalledWith("admin-1", "rep-1");
    expect(mocks.listarAcciones).toHaveBeenCalledWith("admin-1", "rep-1");
  });

  it("muestra estado, motivo, reporter, publicación vinculada y detalles (spec: historial completo)", async () => {
    await renderizarPagina();

    expect(screen.getByTestId("estado-reporte")).toHaveTextContent("Revisado");
    expect(screen.getByText("Fraude o estafa")).toBeInTheDocument();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Tractor John Deere" })
    ).toHaveAttribute("href", "/listados/lista-1");
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Precio sospechoso para un tractor 2020")).toBeInTheDocument();
  });

  it("muestra el historial cronológico ascendente con quién, cuándo y qué (spec: historial completo)", async () => {
    await renderizarPagina();

    const historial = screen.getByRole("list", {
      name: "Historial de acciones de moderación",
    });
    const pasos = within(historial).getAllByRole("listitem");
    expect(pasos).toHaveLength(2);

    // El primer paso (el más antiguo) es la revisión; el segundo, la resolución.
    expect(within(pasos[0]).getByText("Revisado")).toBeInTheDocument();
    expect(within(pasos[1]).getByText("Resuelto")).toBeInTheDocument();
    expect(within(pasos[0]).getByText("Carlos Moderador")).toBeInTheDocument();
  });

  it("muestra el estado vacío del historial cuando no hay acciones", async () => {
    mocks.listarAcciones.mockResolvedValue([]);

    await renderizarPagina();

    expect(
      screen.getByText("Todavía no hay acciones registradas para este reporte.")
    ).toBeInTheDocument();
  });

  it("pasa mostrarAccionesPublicacion=true al componente de acciones (detalle)", async () => {
    await renderizarPagina();

    const accionesReporte = screen.getByTestId("acciones-reporte");
    expect(accionesReporte).toHaveAttribute("data-mostrar", "true");
    expect(accionesReporte).toHaveAttribute("data-reporte", "rep-1");
    expect(accionesReporte).toHaveAttribute("data-listing", "lista-1");
    expect(accionesReporte).toHaveAttribute("data-estado", "REVIEWED");
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

  it("responde 404 cuando el reporte no existe", async () => {
    mocks.obtenerReporteDetalle.mockRejectedValue(new ReporteNoEncontradoError());

    await expect(renderizarPagina("inexistente")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });
});
