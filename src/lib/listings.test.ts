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
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
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
  ImagenInvalidaError,
  obtenerPublicacionesActivas,
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

describe("Titularidad de las imágenes de una publicación", () => {
  const urlDe = (publicId: string) =>
    `https://res.cloudinary.com/cuenta/image/upload/v1/${publicId}.jpg`;
  const imagenPropia = {
    url: urlDe("don-segundo/vendedor-1/propia"),
    publicId: "don-segundo/vendedor-1/propia",
  };
  const imagenAjena = {
    url: urlDe("don-segundo/otro-usuario/ajena"),
    publicId: "don-segundo/otro-usuario/ajena",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obtenerCuentaMpVigente.mockResolvedValue(cuentaMpVigente);
    mocks.findUniqueCategory.mockResolvedValue({ id: "cat-1" });
  });

  it("crearPublicacion acepta imágenes subidas por el vendedor", async () => {
    mocks.createListing.mockResolvedValue({ id: "listing-1" });

    await crearPublicacion("vendedor-1", { ...datosPublicacion, imagenes: [imagenPropia] });

    expect(mocks.createListing).toHaveBeenCalledTimes(1);
  });

  it("crearPublicacion rechaza una imagen ajena sin crear nada", async () => {
    await expect(
      crearPublicacion("vendedor-1", { ...datosPublicacion, imagenes: [imagenAjena] })
    ).rejects.toBeInstanceOf(ImagenInvalidaError);

    expect(mocks.createListing).not.toHaveBeenCalled();
  });

  it("actualizarPublicacion rechaza una imagen ajena sin borrar nada de Cloudinary", async () => {
    mocks.findFirstListing.mockResolvedValue({
      id: "listing-1",
      ownerId: "vendedor-1",
      price: new Prisma.Decimal("1500000.00"),
      images: [],
    });

    await expect(
      actualizarPublicacion("listing-1", "vendedor-1", {
        ...datosPublicacion,
        imagenes: [imagenAjena],
      })
    ).rejects.toBeInstanceOf(ImagenInvalidaError);

    expect(mocks.updateListing).not.toHaveBeenCalled();
    expect(mocks.eliminarImagen).not.toHaveBeenCalled();
  });

  it("actualizarPublicacion conserva imágenes ya guardadas aunque sean anteriores a la regla", async () => {
    const imagenAnterior = {
      url: urlDe("don-segundo/sin-dueno"),
      publicId: "don-segundo/sin-dueno",
    };
    mocks.findFirstListing.mockResolvedValue({
      id: "listing-1",
      ownerId: "vendedor-1",
      price: new Prisma.Decimal("1500000.00"),
      images: [imagenAnterior],
    });
    mocks.updateListing.mockResolvedValue({
      id: "listing-1",
      title: datosPublicacion.title,
      price: new Prisma.Decimal("1500000.00"),
    });

    await actualizarPublicacion("listing-1", "vendedor-1", {
      ...datosPublicacion,
      imagenes: [imagenAnterior],
    });

    expect(mocks.updateListing).toHaveBeenCalledTimes(1);
  });
});

describe("obtenerPublicacionesActivas", () => {
  const categoriaId = "6f1c2a7e-0d0b-4c55-9a51-3f0f7a2b9c10";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryRaw.mockImplementation((consulta: Prisma.Sql) =>
      Promise.resolve(consulta.sql.includes("COUNT(*)") ? [{ total: BigInt(0) }] : [])
    );
  });

  function consultaDeIds(): Prisma.Sql {
    return mocks.queryRaw.mock.calls
      .map(([consulta]) => consulta as Prisma.Sql)
      .find((consulta) => !consulta.sql.includes("COUNT(*)")) as Prisma.Sql;
  }

  it("el filtro de categoría incluye las subcategorías (RF-15)", async () => {
    await obtenerPublicacionesActivas({ categoria: categoriaId });

    const consulta = consultaDeIds();
    expect(consulta.sql).toContain(
      '"categoryId" IN (SELECT "id" FROM "Category" WHERE "id" = ? OR "parentId" = ?)'
    );
    expect(consulta.values).toEqual(expect.arrayContaining([categoriaId]));
  });

  it("filtra por condición nuevo/usado (RF-15)", async () => {
    await obtenerPublicacionesActivas({ condicion: "USED" });

    const consulta = consultaDeIds();
    expect(consulta.sql).toContain('"condition"::text = ?');
    expect(consulta.values).toContain("USED");
  });

  it("sin filtros no restringe por categoría ni condición", async () => {
    const resultado = await obtenerPublicacionesActivas();

    const consulta = consultaDeIds();
    expect(consulta.sql).not.toContain("categoryId");
    expect(consulta.sql).not.toContain("condition");
    expect(resultado).toMatchObject({ publicaciones: [], total: 0, totalPaginas: 1 });
    expect(mocks.findManyListings).not.toHaveBeenCalled();
  });
});
