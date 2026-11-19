import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), esAdministrador: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/reportes", () => ({ esAdministrador: mocks.esAdministrador }));

import { ErrorDePruebaSentry } from "@/lib/observabilidad";
import { GET } from "./route";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/admin/probar-errores (RNF-14)", () => {
  it("sin sesión responde 401", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("un usuario común recibe 403 y no dispara el error", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    expect((await GET()).status).toBe(403);
  });

  it("si el claim dice ADMIN pero la base no, responde 403", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    mocks.esAdministrador.mockResolvedValue(false);
    expect((await GET()).status).toBe(403);
  });

  it("un admin dispara el error de prueba", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    mocks.esAdministrador.mockResolvedValue(true);
    await expect(GET()).rejects.toBeInstanceOf(ErrorDePruebaSentry);
  });
});
