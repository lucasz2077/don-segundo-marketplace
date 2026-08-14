import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  cambiarEstadoReporte: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

// Se preservan las clases de error reales del service (el handler usa
// `instanceof`): solo se reemplaza la función de cambio de estado.
vi.mock("@/lib/reportes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reportes")>();
  return { ...actual, cambiarEstadoReporte: mocks.cambiarEstadoReporte };
});

// Evita instanciar el adaptador PrismaPg al importar el módulo real (mismo
// patrón que src/lib/reportes.test.ts); no se usa en estos tests.
vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

import { PATCH } from "@/app/api/reportes/[id]/route";
import {
  ReporteNoEncontradoError,
  SinPermisoAdminError,
  TransicionEstadoInvalidaError,
} from "@/lib/reportes";

const URL = "http://localhost/api/reportes/reporte-1";
const REPORTE_ID = "reporte-1";

function patchRequest(contenido?: unknown, bodyInvalido = false): NextRequest {
  const opciones: RequestInit = {
    method: "PATCH",
    headers: { "content-type": "application/json" },
  };
  if (bodyInvalido) {
    opciones.body = "{no es json";
  } else {
    opciones.body = JSON.stringify(contenido);
  }
  return new Request(URL, opciones) as NextRequest;
}

const params = () => Promise.resolve({ id: REPORTE_ID });

describe("PATCH /api/reportes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 NO_AUTENTICADO sin sesión y no cambia nada", async () => {
    mocks.getSession.mockResolvedValue(null);

    const respuesta = await PATCH(patchRequest({ estado: "REVIEWED" }), {
      params: params(),
    });

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      error: { code: "NO_AUTENTICADO", message: "Debes iniciar sesión" },
    });
    expect(mocks.cambiarEstadoReporte).not.toHaveBeenCalled();
  });

  it("responde 403 SIN_PERMISO para un usuario sin rol ADMIN", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1", role: "USER" } });

    const respuesta = await PATCH(patchRequest({ estado: "REVIEWED" }), {
      params: params(),
    });

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("SIN_PERMISO");
    expect(mocks.cambiarEstadoReporte).not.toHaveBeenCalled();
  });

  it("responde 400 CUERPO_INVALIDO cuando el body no es JSON válido", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const respuesta = await PATCH(patchRequest(undefined, true), {
      params: params(),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("CUERPO_INVALIDO");
    expect(mocks.cambiarEstadoReporte).not.toHaveBeenCalled();
  });

  it("responde 400 VALIDACION cuando el estado no es válido", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const respuesta = await PATCH(patchRequest({ estado: "BORRADO" }), {
      params: params(),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("VALIDACION");
    expect(mocks.cambiarEstadoReporte).not.toHaveBeenCalled();
  });

  it("responde 400 TRANSICION_INVALIDA cuando la transición no procede", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.cambiarEstadoReporte.mockRejectedValue(
      new TransicionEstadoInvalidaError("OPEN", "RESOLVED")
    );

    const respuesta = await PATCH(patchRequest({ estado: "RESOLVED" }), {
      params: params(),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("TRANSICION_INVALIDA");
    expect(cuerpo.error.message).toContain("Abierto");
  });

  it("responde 404 REPORTE_NO_ENCONTRADO cuando el reporte no existe", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.cambiarEstadoReporte.mockRejectedValue(new ReporteNoEncontradoError());

    const respuesta = await PATCH(patchRequest({ estado: "REVIEWED" }), {
      params: params(),
    });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("REPORTE_NO_ENCONTRADO");
  });

  it("responde 403 SIN_PERMISO si el rol verificado en DB no es admin", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.cambiarEstadoReporte.mockRejectedValue(new SinPermisoAdminError());

    const respuesta = await PATCH(patchRequest({ estado: "REVIEWED" }), {
      params: params(),
    });

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("SIN_PERMISO");
  });

  it("cambia el estado con el admin autenticado y responde 200 con { data }", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.cambiarEstadoReporte.mockResolvedValue({
      id: REPORTE_ID,
      status: "REVIEWED",
    });

    const respuesta = await PATCH(patchRequest({ estado: "REVIEWED" }), {
      params: params(),
    });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ data: { id: REPORTE_ID, status: "REVIEWED" } });
    expect(mocks.cambiarEstadoReporte).toHaveBeenCalledWith(
      "admin-1",
      REPORTE_ID,
      "REVIEWED"
    );
  });
});
