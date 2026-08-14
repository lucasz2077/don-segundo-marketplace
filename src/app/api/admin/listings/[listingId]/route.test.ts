import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  pausarPublicacionReporte: vi.fn(),
  rechazarPublicacionReporte: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

// Se preservan las clases de error reales del service (el handler usa
// `instanceof`): solo se reemplazan las funciones de pausar/rechazar.
vi.mock("@/lib/reportes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reportes")>();
  return {
    ...actual,
    pausarPublicacionReporte: mocks.pausarPublicacionReporte,
    rechazarPublicacionReporte: mocks.rechazarPublicacionReporte,
  };
});

// Evita instanciar el adaptador PrismaPg al importar el módulo real (mismo
// patrón que src/lib/reportes.test.ts); no se usa en estos tests.
vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

import { PATCH } from "@/app/api/admin/listings/[listingId]/route";
import {
  PublicacionNoDisponibleError,
  ReporteNoEncontradoError,
  ReporteNoRevisadoError,
  SinPermisoAdminError,
} from "@/lib/reportes";

const LISTING_ID = "lista-1";
const REPORTE_ID = "550e8400-e29b-41d4-a716-446655440000";
const URL = `http://localhost/api/admin/listings/${LISTING_ID}`;

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

const params = () => Promise.resolve({ listingId: LISTING_ID });

const accionPausar = { accion: "PAUSED", reporteId: REPORTE_ID };
const accionRechazar = { accion: "REJECTED", reporteId: REPORTE_ID };

describe("PATCH /api/admin/listings/[listingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 NO_AUTENTICADO sin sesión y no aplica nada", async () => {
    mocks.getSession.mockResolvedValue(null);

    const respuesta = await PATCH(patchRequest(accionPausar), {
      params: params(),
    });

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      error: { code: "NO_AUTENTICADO", message: "Debes iniciar sesión" },
    });
    expect(mocks.pausarPublicacionReporte).not.toHaveBeenCalled();
    expect(mocks.rechazarPublicacionReporte).not.toHaveBeenCalled();
  });

  it("responde 403 SIN_PERMISO para un usuario sin rol ADMIN", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1", role: "USER" } });

    const respuesta = await PATCH(patchRequest(accionPausar), {
      params: params(),
    });

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("SIN_PERMISO");
    expect(mocks.pausarPublicacionReporte).not.toHaveBeenCalled();
    expect(mocks.rechazarPublicacionReporte).not.toHaveBeenCalled();
  });

  it("responde 400 CUERPO_INVALIDO cuando el body no es JSON válido", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const respuesta = await PATCH(patchRequest(undefined, true), {
      params: params(),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("CUERPO_INVALIDO");
    expect(mocks.pausarPublicacionReporte).not.toHaveBeenCalled();
  });

  it("responde 400 VALIDACION cuando la acción no es PAUSED ni REJECTED", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    // La API nueva usa los valores del enum (PAUSED/REJECTED), no verbos.
    const respuesta = await PATCH(patchRequest({ accion: "pausar", reporteId: REPORTE_ID }), {
      params: params(),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("VALIDACION");
    expect(mocks.pausarPublicacionReporte).not.toHaveBeenCalled();
  });

  it("responde 400 VALIDACION cuando el reporteId no es un uuid", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const respuesta = await PATCH(patchRequest({ accion: "PAUSED", reporteId: "no-es-uuid" }), {
      params: params(),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("VALIDACION");
    expect(mocks.pausarPublicacionReporte).not.toHaveBeenCalled();
  });

  it("responde 400 REPORTE_NO_REVISADO cuando el reporte origen no está REVIEWED", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.pausarPublicacionReporte.mockRejectedValue(new ReporteNoRevisadoError());

    const respuesta = await PATCH(patchRequest(accionPausar), {
      params: params(),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("REPORTE_NO_REVISADO");
    expect(cuerpo.error.message).toContain("Revisado");
  });

  it("responde 404 REPORTE_NO_ENCONTRADO cuando el reporte origen no existe", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.rechazarPublicacionReporte.mockRejectedValue(new ReporteNoEncontradoError());

    const respuesta = await PATCH(patchRequest(accionRechazar), {
      params: params(),
    });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("REPORTE_NO_ENCONTRADO");
  });

  it("responde 404 NO_ENCONTRADA cuando la publicación no existe", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.pausarPublicacionReporte.mockRejectedValue(new PublicacionNoDisponibleError());

    const respuesta = await PATCH(patchRequest(accionPausar), {
      params: params(),
    });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("NO_ENCONTRADA");
  });

  it("responde 403 SIN_PERMISO si el rol verificado en DB no es admin", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.pausarPublicacionReporte.mockRejectedValue(new SinPermisoAdminError());

    const respuesta = await PATCH(patchRequest(accionPausar), {
      params: params(),
    });

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("SIN_PERMISO");
  });

  it("pausa la publicación auditando el reporte origen y responde 200 con { data }", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.pausarPublicacionReporte.mockResolvedValue({
      publicacion: { id: LISTING_ID, status: "PAUSED" },
      accion: { id: "accion-1", reportId: REPORTE_ID, adminId: "admin-1", accion: "PAUSED" },
    });

    const respuesta = await PATCH(patchRequest(accionPausar), {
      params: params(),
    });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.publicacion.status).toBe("PAUSED");
    expect(cuerpo.data.accion.accion).toBe("PAUSED");
    expect(mocks.pausarPublicacionReporte).toHaveBeenCalledWith(
      "admin-1",
      LISTING_ID,
      REPORTE_ID
    );
    expect(mocks.rechazarPublicacionReporte).not.toHaveBeenCalled();
  });

  it("rechaza la publicación auditando el reporte origen y responde 200 con { data }", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.rechazarPublicacionReporte.mockResolvedValue({
      publicacion: { id: LISTING_ID, status: "REJECTED", deletedAt: "2026-08-13T00:00:00Z" },
      accion: { id: "accion-2", reportId: REPORTE_ID, adminId: "admin-1", accion: "REJECTED" },
    });

    const respuesta = await PATCH(patchRequest(accionRechazar), {
      params: params(),
    });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.data.publicacion.status).toBe("REJECTED");
    expect(mocks.rechazarPublicacionReporte).toHaveBeenCalledWith(
      "admin-1",
      LISTING_ID,
      REPORTE_ID
    );
    expect(mocks.pausarPublicacionReporte).not.toHaveBeenCalled();
  });
});
