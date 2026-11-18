import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  completarVinculacionMp: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/pagos/oauth", () => ({
  completarVinculacionMp: mocks.completarVinculacionMp,
  stateOAuth: (token: string) => `state-de-${token}`,
}));

import { GET } from "@/app/api/pagos/oauth/callback/route";

const peticion = (query: string) =>
  new Request(`https://campo.example.com/api/pagos/oauth/callback?${query}`) as NextRequest;

const destino = (respuesta: Response) =>
  new URL(respuesta.headers.get("location") ?? "").pathname +
  new URL(respuesta.headers.get("location") ?? "").search;

describe("GET /api/pagos/oauth/callback (RF-48)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      user: { id: "vendedor-1" },
      session: { token: "token-1" },
    });
  });

  it("vincula y vuelve al perfil con el aviso de éxito", async () => {
    mocks.completarVinculacionMp.mockResolvedValue({ mpUserId: "123" });

    const respuesta = await GET(peticion("code=TG-1&state=state-de-token-1"));

    expect(mocks.completarVinculacionMp).toHaveBeenCalledWith({ userId: "vendedor-1", code: "TG-1" });
    expect(respuesta.status).toBe(302);
    expect(destino(respuesta)).toBe("/perfil?mp=vinculada");
  });

  it("si MP rechaza el intercambio vuelve al perfil con el aviso de error", async () => {
    mocks.completarVinculacionMp.mockRejectedValue(
      Object.assign(new Error("invalid_grant"), { status: 400 })
    );

    const respuesta = await GET(peticion("code=TG-1&state=state-de-token-1"));

    expect(destino(respuesta)).toBe("/perfil?mp=error");
  });

  it("sin code (el vendedor canceló) vuelve al perfil sin vincular", async () => {
    const respuesta = await GET(peticion("error=access_denied&state=state-de-token-1"));

    expect(destino(respuesta)).toBe("/perfil?mp=cancelado");
    expect(mocks.completarVinculacionMp).not.toHaveBeenCalled();
  });

  it("con un state ajeno (CSRF) no vincula nada", async () => {
    const respuesta = await GET(peticion("code=TG-1&state=otro-state"));

    expect(destino(respuesta)).toBe("/perfil?mp=error");
    expect(mocks.completarVinculacionMp).not.toHaveBeenCalled();
  });

  it("sin sesión manda al login", async () => {
    mocks.getSession.mockResolvedValue(null);

    const respuesta = await GET(peticion("code=TG-1&state=x"));

    expect(destino(respuesta)).toBe("/sign-in?redirect=/perfil");
    expect(mocks.completarVinculacionMp).not.toHaveBeenCalled();
  });
});
