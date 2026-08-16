import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  findManyListings: vi.fn(),
  findUniqueCategory: vi.fn(),
  createListing: vi.fn(),
  findFirstListing: vi.fn(),
  updateListing: vi.fn(),
  obtenerCuentaMpVigente: vi.fn(),
  eliminarImagen: vi.fn(),
  notificarFavoritosCambioPublicacion: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    listing: {
      findMany: mocks.findManyListings,
      create: mocks.createListing,
      findFirst: mocks.findFirstListing,
      update: mocks.updateListing,
    },
    category: { findUnique: mocks.findUniqueCategory },
  },
}));

vi.mock("@/lib/pagos/oauth", () => ({
  obtenerCuentaMpVigente: mocks.obtenerCuentaMpVigente,
}));

vi.mock("@/lib/cloudinary", () => ({
  eliminarImagen: mocks.eliminarImagen,
}));

vi.mock("@/lib/notificaciones", () => ({
  notificarFavoritosCambioPublicacion: mocks.notificarFavoritosCambioPublicacion,
}));

import {
  actualizarPublicacion,
  crearPublicacion,
  obtenerPublicacionesRecientes,
  SinCuentaMpError,
} from "@/lib/listings";

const cuentaMpVigente = {
  id: "mp-1",
  userId: "vendedor-1",
  mpUserId: "123456789",
  accessToken: "APP_USR-VENDEDOR",
  refreshToken: null,
  accessTokenExpiresAt: null,
  liveMode: false,
  revocadaAt: null,
  createdAt: new Date("2026-08-15T00:00:00Z"),
  updatedAt: new Date("2026-08-15T00:00:00Z"),
};

const datosPublicacion = {
  title: "Tractor agrícola en excelente estado",
  description: "Tractor marca John Deere con muy poco uso, ideal para el campo.",
  price: 1500000,
  currency: "ARS",
  condition: "USED",
  stock: 3,
  categoryId: "cat-1",
  province: "Buenos Aires",
  city: "Pergamino",
};

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
      select: {
        bio: true,
        businessName: true,
        sellerVerified: true,
        ratingAvg: true,
        ratingCount: true,
      },
    });
    // La ampliación no expone datos privados del vendedor (REQ-12/RF-19).
    expect(argumento.include.owner.select.email).toBeUndefined();
    expect(argumento.include.owner.select.phone).toBeUndefined();
    expect(argumento.include.owner.select.dni).toBeUndefined();
  });
});

describe("RF-47 — OAuth de Mercado Pago obligatorio para publicar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obtenerCuentaMpVigente.mockResolvedValue(cuentaMpVigente);
    mocks.findUniqueCategory.mockResolvedValue({ id: "cat-1" });
  });

  it("crearPublicacion rechaza con SinCuentaMpError si el vendedor no tiene cuenta MP vigente", async () => {
    mocks.obtenerCuentaMpVigente.mockResolvedValue(null);

    await expect(crearPublicacion("vendedor-1", datosPublicacion)).rejects.toBeInstanceOf(
      SinCuentaMpError
    );

    // Ni siquiera valida la categoría ni crea la publicación (RF-47).
    expect(mocks.findUniqueCategory).not.toHaveBeenCalled();
    expect(mocks.createListing).not.toHaveBeenCalled();
  });

  it("crearPublicacion procede cuando el vendedor tiene cuenta MP vigente", async () => {
    mocks.createListing.mockResolvedValue({ id: "listing-1" });

    const resultado = await crearPublicacion("vendedor-1", datosPublicacion);

    expect(mocks.obtenerCuentaMpVigente).toHaveBeenCalledWith("vendedor-1");
    expect(mocks.createListing).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ id: "listing-1" });
  });

  it("actualizarPublicacion rechaza con SinCuentaMpError si el vendedor no tiene cuenta MP vigente", async () => {
    mocks.obtenerCuentaMpVigente.mockResolvedValue(null);

    await expect(
      actualizarPublicacion("listing-1", "vendedor-1", datosPublicacion)
    ).rejects.toBeInstanceOf(SinCuentaMpError);

    expect(mocks.findFirstListing).not.toHaveBeenCalled();
    expect(mocks.updateListing).not.toHaveBeenCalled();
  });

  it("actualizarPublicacion procede con cuenta MP vigente (precio sin cambios, sin notificación)", async () => {
    mocks.findFirstListing.mockResolvedValue({
      id: "listing-1",
      ownerId: "vendedor-1",
      price: new Prisma.Decimal("1500000.00"),
      images: [],
    });
    mocks.updateListing.mockResolvedValue({
      id: "listing-1",
      title: datosPublicacion.title,
      price: new Prisma.Decimal("1500000.00"),
    });

    const resultado = await actualizarPublicacion("listing-1", "vendedor-1", datosPublicacion);

    expect(mocks.obtenerCuentaMpVigente).toHaveBeenCalledWith("vendedor-1");
    expect(resultado).toEqual({
      id: "listing-1",
      title: datosPublicacion.title,
      price: new Prisma.Decimal("1500000.00"),
    });
    expect(mocks.notificarFavoritosCambioPublicacion).not.toHaveBeenCalled();
  });
});
