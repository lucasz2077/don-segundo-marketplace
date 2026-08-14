import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccionesReporte } from "./acciones-reporte";

const mocks = vi.hoisted(() => ({
  useRouter: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: mocks.useRouter,
}));

const REPORTE_ID = "550e8400-e29b-41d4-a716-446655440000";
const LISTING_ID = "lista-1";

function respuestaOk() {
  return { ok: true, json: async () => ({ data: {} }) } as Response;
}

function respuestaError(mensaje: string) {
  return {
    ok: false,
    json: async () => ({ error: { code: "X", message: mensaje } }),
  } as Response;
}

async function cuerpoEnviado() {
  const [url, opciones] = mocks.fetch.mock.calls[0];
  return { url, cuerpo: JSON.parse(opciones.body as string) };
}

describe("AccionesReporte (flujo estricto RF-25)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ refresh: vi.fn(), push: vi.fn() });
    vi.spyOn(globalThis, "fetch").mockImplementation(mocks.fetch);
    mocks.fetch.mockResolvedValue(respuestaOk());
  });

  it("desde OPEN solo ofrece revisar y envía PATCH con estado REVIEWED", async () => {
    render(
      <AccionesReporte
        reporteId={REPORTE_ID}
        listingId={LISTING_ID}
        estado="OPEN"
      />
    );

    expect(
      screen.getByRole("button", { name: "Marcar como revisado" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resuelto/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /descartar/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Marcar como revisado" }));
    await screen.findByText("Reporte marcado como revisado");

    const { url, cuerpo } = await cuerpoEnviado();
    expect(url).toBe(`/api/reportes/${REPORTE_ID}`);
    expect(cuerpo).toEqual({ estado: "REVIEWED" });
    expect(mocks.useRouter().refresh).toHaveBeenCalled();
  });

  it("desde REVIEWED ofrece resuelto y descartado, sin pausar/rechazar por defecto", async () => {
    render(
      <AccionesReporte
        reporteId={REPORTE_ID}
        listingId={LISTING_ID}
        estado="REVIEWED"
      />
    );

    expect(
      screen.getByRole("button", { name: "Marcar como resuelto" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Descartar reporte" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pausar publicación" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Rechazar publicación" })
    ).not.toBeInTheDocument();
  });

  it("con mostrarAccionesPublicacion ofrece pausar/rechazar y envía el contrato nuevo (PAUSED + reporteId)", async () => {
    render(
      <AccionesReporte
        reporteId={REPORTE_ID}
        listingId={LISTING_ID}
        estado="REVIEWED"
        mostrarAccionesPublicacion
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Pausar publicación" }));
    await screen.findByText("Publicación pausada");

    const { url, cuerpo } = await cuerpoEnviado();
    expect(url).toBe(`/api/admin/listings/${LISTING_ID}`);
    expect(cuerpo).toEqual({ accion: "PAUSED", reporteId: REPORTE_ID });
  });

  it("rechazar publicación envía REJECTED con reporteId y marca el botón como peligroso", async () => {
    render(
      <AccionesReporte
        reporteId={REPORTE_ID}
        listingId={LISTING_ID}
        estado="REVIEWED"
        mostrarAccionesPublicacion
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Rechazar publicación" })
    );
    await screen.findByText("Publicación rechazada");

    const { url, cuerpo } = await cuerpoEnviado();
    expect(url).toBe(`/api/admin/listings/${LISTING_ID}`);
    expect(cuerpo).toEqual({ accion: "REJECTED", reporteId: REPORTE_ID });
  });

  it("resolver desde REVIEWED envía estado RESOLVED al PATCH del reporte", async () => {
    render(
      <AccionesReporte
        reporteId={REPORTE_ID}
        listingId={LISTING_ID}
        estado="REVIEWED"
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Marcar como resuelto" })
    );
    await screen.findByText("Reporte marcado como resuelto");

    const { url, cuerpo } = await cuerpoEnviado();
    expect(url).toBe(`/api/reportes/${REPORTE_ID}`);
    expect(cuerpo).toEqual({ estado: "RESOLVED" });
  });

  it("desde un estado terminal no ofrece ninguna acción", async () => {
    render(
      <AccionesReporte
        reporteId={REPORTE_ID}
        listingId={LISTING_ID}
        estado="RESOLVED"
        mostrarAccionesPublicacion
      />
    );

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("redirige a sign-in ante 401", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 401 } as Response);

    render(
      <AccionesReporte
        reporteId={REPORTE_ID}
        listingId={LISTING_ID}
        estado="OPEN"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Marcar como revisado" }));

    await vi.waitFor(() => {
      expect(mocks.useRouter().push).toHaveBeenCalledWith("/sign-in");
    });
  });

  it("muestra el mensaje de error de la API sin refrescar", async () => {
    mocks.fetch.mockResolvedValue(
      respuestaError("No se puede pasar el reporte de Abierto a Resuelto.")
    );

    render(
      <AccionesReporte
        reporteId={REPORTE_ID}
        listingId={LISTING_ID}
        estado="OPEN"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Marcar como revisado" }));

    expect(
      await screen.findByText("No se puede pasar el reporte de Abierto a Resuelto.")
    ).toBeInTheDocument();
    expect(mocks.useRouter().refresh).not.toHaveBeenCalled();
  });
});