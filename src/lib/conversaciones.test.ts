import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findManyConversations: vi.fn(),
  findManyMessages: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    conversation: { findMany: mocks.findManyConversations },
    message: { findMany: mocks.findManyMessages },
  },
}));

import { obtenerConversacionesDeUsuario } from "@/lib/conversaciones";

describe("seleccionUsuarioConversacion ampliado (TC-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("incluye profile{bio,businessName} en comprador y vendedor, sin datos personales (REQ-12)", async () => {
    mocks.findManyConversations.mockResolvedValue([]);
    mocks.findManyMessages.mockResolvedValue([]);

    await obtenerConversacionesDeUsuario("usuario-1");

    const [argumento] = mocks.findManyConversations.mock.calls[0] as [
      {
        include: {
          buyer: { select: Record<string, unknown> };
          seller: { select: Record<string, unknown> };
        };
      }
    ];
    const esperado = { select: { bio: true, businessName: true } };
    expect(argumento.include.buyer.select.profile).toEqual(esperado);
    expect(argumento.include.seller.select.profile).toEqual(esperado);
    // La ampliación no expone datos privados del participante (REQ-12/RF-19).
    expect(argumento.include.buyer.select.email).toBeUndefined();
    expect(argumento.include.seller.select.phone).toBeUndefined();
    expect(argumento.include.seller.select.dni).toBeUndefined();
  });
});
