import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findManyListings: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    listing: { findMany: mocks.findManyListings },
  },
}));

import { obtenerPublicacionesRecientes } from "@/lib/listings";

describe("seleccionPropietario ampliado (TC-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("incluye profile{bio,businessName} del dueño y ningún dato personal (REQ-12)", async () => {
    mocks.findManyListings.mockResolvedValue([]);

    await obtenerPublicacionesRecientes(1);

    const [argumento] = mocks.findManyListings.mock.calls[0] as [
      {
        include: {
          owner: { select: Record<string, unknown> };
        };
      }
    ];
    expect(argumento.include.owner.select.profile).toEqual({
      select: { bio: true, businessName: true, sellerVerified: true },
    });
    // La ampliación no expone datos privados del vendedor (REQ-12/RF-19).
    expect(argumento.include.owner.select.email).toBeUndefined();
    expect(argumento.include.owner.select.phone).toBeUndefined();
    expect(argumento.include.owner.select.dni).toBeUndefined();
  });
});
