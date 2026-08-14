import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  crearReporte: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

// Se preservan las clases de error reales del service (el handler usa
// `instanceof`): solo se reemplaza la función de creación de reportes.
vi.mock("@/lib/reportes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reportes")>();
  return { ...actual, crearReporte: mocks.crearReporte };
});

// Evita instanciar el adaptador PrismaPg al importar el módulo real (mismo
// patrón que src/lib/reportes.test.ts); no se usa en estos tests.
vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

import { POST } from "@/app/api/reportes/route";
import {
  AutoReporteError,
  LimiteReportesError,
  PublicacionNoDisponibleError,
} from "@/lib/reportes";

const URL = "http://localhost/api/reportes";

function postRequest(contenido?: unknown, bodyInvalido = false): NextRequest {
  const opciones: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
  };
  if (bodyInvalido) {
    opciones.body = "{no es json";
  } else {
    opciones.body = JSON.stringify(contenido);
  }
  return new Request(URL, opciones) as NextRequest;
}

const reporteValido = {
  listingId: "550e8400-e29b-41d4-a716-446655440000",
  razon: "FRAUD",
  detalles: "Publica maquinaria robada",
};

describe("POST /api/reportes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 NO_AUTENTICADO sin sesión y no crea nada", async () => {
    mocks.getSession.mockResolvedValue(null);

    const respuesta = await POST(postRequest(reporteValido));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      error: { code: "NO_AUTENTICADO", message: "Debes iniciar sesión" },
    });
    expect(mocks.crearReporte).not.toHaveBeenCalled();
  });

  it("responde 400 CUERPO_INVALIDO cuando el body no es JSON válido", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });

    const respuesta = await POST(postRequest(undefined, true));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("CUERPO_INVALIDO");
    expect(mocks.crearReporte).not.toHaveBeenCalled();
  });

  it("responde 400 VALIDACION cuando el motivo no es válido", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });

    const respuesta = await POST(
      postRequest({ ...reporteValido, razon: "MOTIVO_INVENTADO" })
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("VALIDACION");
    expect(mocks.crearReporte).not.toHaveBeenCalled();
  });

  it("responde 404 NO_ENCONTRADA cuando la publicación no está disponible", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });
    mocks.crearReporte.mockRejectedValue(new PublicacionNoDisponibleError());

    const respuesta = await POST(postRequest(reporteValido));

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("NO_ENCONTRADA");
    expect(cuerpo.error.message).toContain("no está disponible");
  });

  it("responde 400 SIN_PERMISO cuando el usuario reporta su propia publicación", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });
    mocks.crearReporte.mockRejectedValue(new AutoReporteError());

    const respuesta = await POST(postRequest(reporteValido));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("SIN_PERMISO");
  });

  it("responde 429 REPORT_LIMIT_EXCEEDED al superar el límite diario", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });
    mocks.crearReporte.mockRejectedValue(new LimiteReportesError());

    const respuesta = await POST(postRequest(reporteValido));

    expect(respuesta.status).toBe(429);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("REPORT_LIMIT_EXCEEDED");
    expect(cuerpo.error.message).toContain("5 reportes por día");
  });

  it("crea el reporte con session.user.id y responde 201 con { data }", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });
    mocks.crearReporte.mockResolvedValue({
      id: "reporte-1",
      status: "OPEN",
      reporterId: "usuario-1",
      listingId: reporteValido.listingId,
      reason: "FRAUD",
    });

    const respuesta = await POST(postRequest(reporteValido));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      data: {
        id: "reporte-1",
        status: "OPEN",
        reporterId: "usuario-1",
        listingId: reporteValido.listingId,
        reason: "FRAUD",
      },
    });
    expect(mocks.crearReporte).toHaveBeenCalledWith("usuario-1", reporteValido);
  });
});
