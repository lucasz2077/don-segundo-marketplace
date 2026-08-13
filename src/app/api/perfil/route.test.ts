import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  actualizarMiPerfil: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/perfiles", () => ({
  actualizarMiPerfil: mocks.actualizarMiPerfil,
}));

import { PATCH } from "@/app/api/perfil/route";

const URL = "http://localhost/api/perfil";

function patchRequest(contenido?: unknown, bodyInvalido?: string): NextRequest {
  if (bodyInvalido !== undefined) {
    return new Request(URL, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: bodyInvalido,
    }) as NextRequest;
  }
  return new Request(URL, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(contenido),
  }) as NextRequest;
}

describe("PATCH /api/perfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 NO_AUTENTICADO sin sesión y no persiste nada", async () => {
    mocks.getSession.mockResolvedValue(null);

    const respuesta = await PATCH(patchRequest({ bio: "Hola" }));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      error: { code: "NO_AUTENTICADO", message: "Debes iniciar sesión" },
    });
    expect(mocks.actualizarMiPerfil).not.toHaveBeenCalled();
  });

  it("responde 400 CUERPO_INVALIDO cuando el body no es JSON válido", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });

    const respuesta = await PATCH(patchRequest(undefined, "{no es json"));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("CUERPO_INVALIDO");
    expect(mocks.actualizarMiPerfil).not.toHaveBeenCalled();
  });

  it("responde 400 VALIDACION cuando la bio excede el máximo y no persiste", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });

    const respuesta = await PATCH(
      patchRequest({ bio: "a".repeat(501) })
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("VALIDACION");
    expect(cuerpo.error.message).toBe("La bio es demasiado larga");
    expect(mocks.actualizarMiPerfil).not.toHaveBeenCalled();
  });

  it("rechaza un userId en el body (REQ-9: solo se edita el propio)", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });

    const respuesta = await PATCH(
      patchRequest({ bio: "Hola", userId: "usuario-2" })
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.code).toBe("VALIDACION");
    expect(mocks.actualizarMiPerfil).not.toHaveBeenCalled();
  });

  it("actualiza el perfil del dueño (session.user.id) y responde 200 con { data }", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });
    mocks.actualizarMiPerfil.mockResolvedValue({
      id: "perfil-1",
      bio: "Vendo maquinaria agrícola",
      businessName: "Agro Juan",
    });

    const respuesta = await PATCH(
      patchRequest({ bio: "Vendo maquinaria agrícola", businessName: "Agro Juan" })
    );

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      data: {
        id: "perfil-1",
        bio: "Vendo maquinaria agrícola",
        businessName: "Agro Juan",
      },
    });
    // El dueño siempre es session.user.id: la ruta nunca recibe un id ajeno.
    expect(mocks.actualizarMiPerfil).toHaveBeenCalledWith("usuario-1", {
      bio: "Vendo maquinaria agrícola",
      businessName: "Agro Juan",
    });
  });
});