import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirstListing: vi.fn(),
  updateListing: vi.fn(),
  findFirstModerationAction: vi.fn(),
  crearNotificacion: vi.fn(),
  notificarFavoritosCambioPublicacion: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    listing: {
      findFirst: mocks.findFirstListing,
      update: mocks.updateListing,
    },
    moderationAction: { findFirst: mocks.findFirstModerationAction },
  },
}));

vi.mock("@/lib/notificaciones", () => ({
  crearNotificacion: mocks.crearNotificacion,
  notificarCambioEstadoPublicacion: vi.fn(),
  notificarFavoritosCambioPublicacion: mocks.notificarFavoritosCambioPublicacion,
}));

import {
  AccionEstadoInvalidaError,
  PublicacionPausadaPorModeracionError,
  reanudarPublicacionPropia,
} from "@/lib/compras";

const publicacionPausada = {
  id: "l1",
  ownerId: "u1",
  status: "PAUSED",
  title: "Tractor usado",
};

describe("reanudarPublicacionPropia (RF-25)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirstListing.mockResolvedValue(publicacionPausada);
    mocks.updateListing.mockResolvedValue({ id: "l1", status: "ACTIVE" });
  });

  it("reanuda una publicación pausada por su dueño", async () => {
    mocks.findFirstModerationAction.mockResolvedValue(null);

    const resultado = await reanudarPublicacionPropia("u1", "l1");

    expect(resultado).toEqual({ id: "l1", status: "ACTIVE" });
    expect(mocks.findFirstModerationAction).toHaveBeenCalledWith({
      where: { accion: "PAUSED", report: { listingId: "l1" } },
      select: { id: true },
    });
    expect(mocks.updateListing).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { status: "ACTIVE" },
      select: { id: true, status: true },
    });
  });

  it("rechaza reanudar una publicación pausada por moderación sin tocarla", async () => {
    mocks.findFirstModerationAction.mockResolvedValue({ id: "accion-1" });

    await expect(reanudarPublicacionPropia("u1", "l1")).rejects.toBeInstanceOf(
      PublicacionPausadaPorModeracionError
    );
    expect(mocks.updateListing).not.toHaveBeenCalled();
    expect(mocks.crearNotificacion).not.toHaveBeenCalled();
  });

  it("sigue rechazando reanudar una publicación que no está pausada", async () => {
    mocks.findFirstListing.mockResolvedValue({
      ...publicacionPausada,
      status: "SOLD",
    });

    await expect(reanudarPublicacionPropia("u1", "l1")).rejects.toBeInstanceOf(
      AccionEstadoInvalidaError
    );
    expect(mocks.findFirstModerationAction).not.toHaveBeenCalled();
    expect(mocks.updateListing).not.toHaveBeenCalled();
  });
});
