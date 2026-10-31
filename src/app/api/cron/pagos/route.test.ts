import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  renovarTokensPorVencer: vi.fn(),
  reintentarReembolsosPendientes: vi.fn(),
  expirarOrdenesVencidas: vi.fn(),
}));

vi.mock("@/lib/pagos/oauth", () => ({ renovarTokensPorVencer: mocks.renovarTokensPorVencer }));
vi.mock("@/lib/compras", () => ({
  reintentarReembolsosPendientes: mocks.reintentarReembolsosPendientes,
  expirarOrdenesVencidas: mocks.expirarOrdenesVencidas,
}));

import { GET } from "@/app/api/cron/pagos/route";

const peticion = (authorization?: string) =>
  new Request("http://localhost/api/cron/pagos", {
    headers: authorization ? { authorization } : {},
  }) as NextRequest;

describe("GET /api/cron/pagos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.renovarTokensPorVencer.mockResolvedValue({ renovadas: 1, fallidas: 0 });
    mocks.reintentarReembolsosPendientes.mockResolvedValue({ reembolsadas: 0, pendientes: 0 });
    mocks.expirarOrdenesVencidas.mockResolvedValue(2);
  });

  it("rechaza todo si CRON_SECRET no está configurado", async () => {
    const respuesta = await GET(peticion("Bearer cualquiera"));
    expect(respuesta.status).toBe(401);
    expect(mocks.renovarTokensPorVencer).not.toHaveBeenCalled();
  });

  it("rechaza un secreto incorrecto o ausente", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-correcto");
    expect((await GET(peticion("Bearer otro"))).status).toBe(401);
    expect((await GET(peticion())).status).toBe(401);
    expect(mocks.renovarTokensPorVencer).not.toHaveBeenCalled();
  });

  it("con el secreto correcto corre todas las tareas aunque una falle", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-correcto");
    mocks.reintentarReembolsosPendientes.mockRejectedValue(new Error("DB caída"));

    const respuesta = await GET(peticion("Bearer secreto-correcto"));

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({
      data: {
        tokens: { renovadas: 1, fallidas: 0 },
        reembolsos: { error: true },
        ordenesExpiradas: 2,
      },
    });
  });
});
