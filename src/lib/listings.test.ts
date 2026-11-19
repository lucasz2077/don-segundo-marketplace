import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  findManyListings: vi.fn(),
  findUniqueCategory: vi.fn(),
  findUniqueUser: vi.fn(),
  createListing: vi.fn(),
  countListings: vi.fn(),
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
      count: mocks.countListings,
      findFirst: mocks.findFirstListing,
      update: mocks.updateListing,
    },
    category: { findUnique: mocks.findUniqueCategory },
    user: { findUnique: mocks.findUniqueUser },
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
  CuentaNoVendedoraError,
  ImagenInvalidaError,
  monedaEfectiva,
  LIMITE_PUBLICACIONES_POR_DIA,
  LimitePublicacionesError,
  obtenerPublicacionesActivas,
  obtenerPublicacionesRecientes,
  PublicacionNoEditableError,
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
    mocks.findUniqueUser.mockResolvedValue({ accountType: "BOTH" });
    mocks.countListings.mockResolvedValue(0);
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
      status: "ACTIVE",
      deletedAt: null,
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

describe("RF-07 / RF-08 — quién publica y qué se puede editar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obtenerCuentaMpVigente.mockResolvedValue(cuentaMpVigente);
    mocks.findUniqueCategory.mockResolvedValue({ id: "cat-1" });
    mocks.findUniqueUser.mockResolvedValue({ accountType: "BOTH" });
    mocks.countListings.mockResolvedValue(0);
    mocks.createListing.mockResolvedValue({ id: "listing-1" });
    mocks.updateListing.mockResolvedValue({
      id: "listing-1",
      price: new Prisma.Decimal("1500000.00"),
    });
  });

  it("crearPublicacion rechaza una cuenta solo compradora sin crear nada (RF-07)", async () => {
    mocks.findUniqueUser.mockResolvedValue({ accountType: "BUYER" });

    await expect(crearPublicacion("vendedor-1", datosPublicacion)).rejects.toBeInstanceOf(
      CuentaNoVendedoraError
    );
    expect(mocks.obtenerCuentaMpVigente).not.toHaveBeenCalled();
    expect(mocks.createListing).not.toHaveBeenCalled();
  });

  it("crearPublicacion rechaza si el usuario no existe", async () => {
    mocks.findUniqueUser.mockResolvedValue(null);

    await expect(crearPublicacion("vendedor-1", datosPublicacion)).rejects.toBeInstanceOf(
      CuentaNoVendedoraError
    );
    expect(mocks.createListing).not.toHaveBeenCalled();
  });

  it.each(["SELLER", "BOTH"])("crearPublicacion permite publicar a una cuenta %s", async (accountType) => {
    mocks.findUniqueUser.mockResolvedValue({ accountType });

    await crearPublicacion("vendedor-1", datosPublicacion);

    expect(mocks.createListing).toHaveBeenCalledTimes(1);
  });

  it("crearPublicacion rechaza al llegar al límite diario sin crear nada (RNF-07)", async () => {
    mocks.countListings.mockResolvedValue(LIMITE_PUBLICACIONES_POR_DIA);

    await expect(crearPublicacion("vendedor-1", datosPublicacion)).rejects.toBeInstanceOf(
      LimitePublicacionesError
    );
    expect(mocks.createListing).not.toHaveBeenCalled();
    const [argumento] = mocks.countListings.mock.calls[0] as [
      { where: { ownerId: string; createdAt: { gte: Date } } },
    ];
    expect(argumento.where.ownerId).toBe("vendedor-1");
  });

  it.each(["SOLD", "REJECTED", "DELETED"])(
    "actualizarPublicacion rechaza editar una publicación %s (RF-08)",
    async (status) => {
      mocks.findFirstListing.mockResolvedValue({
        id: "listing-1",
        ownerId: "vendedor-1",
        status,
        deletedAt: status === "SOLD" ? null : new Date("2026-11-01T00:00:00Z"),
        price: new Prisma.Decimal("1500000.00"),
        images: [],
      });

      await expect(
        actualizarPublicacion("listing-1", "vendedor-1", datosPublicacion)
      ).rejects.toBeInstanceOf(PublicacionNoEditableError);
      expect(mocks.updateListing).not.toHaveBeenCalled();
      expect(mocks.eliminarImagen).not.toHaveBeenCalled();
    }
  );

  it("actualizarPublicacion permite editar una publicación PAUSED (RF-08)", async () => {
    mocks.findFirstListing.mockResolvedValue({
      id: "listing-1",
      ownerId: "vendedor-1",
      status: "PAUSED",
      deletedAt: null,
      price: new Prisma.Decimal("1500000.00"),
      images: [],
    });

    await actualizarPublicacion("listing-1", "vendedor-1", datosPublicacion);

    expect(mocks.updateListing).toHaveBeenCalledTimes(1);
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
    mocks.findUniqueUser.mockResolvedValue({ accountType: "BOTH" });
    mocks.countListings.mockResolvedValue(0);
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
      status: "ACTIVE",
      deletedAt: null,
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
      status: "ACTIVE",
      deletedAt: null,
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

  it("con moneda elegida filtra por esa moneda y ordena solo por precio (D7)", async () => {
    await obtenerPublicacionesActivas({ moneda: "USD", minPrecio: 10000, orden: "precio-asc" });

    const consulta = consultaDeIds();
    expect(consulta.sql).toContain('"currency"::text = ?');
    expect(consulta.values).toContain("USD");
    expect(consulta.sql).toContain('ORDER BY "price" ASC');
  });

  it("un rango sin moneda se interpreta en pesos (D7)", async () => {
    await obtenerPublicacionesActivas({ maxPrecio: 500000 });

    const consulta = consultaDeIds();
    expect(consulta.sql).toContain('"currency"::text = ?');
    expect(consulta.values).toContain("ARS");
  });

  it("sin moneda, el orden por precio agrupa pesos y dólares sin mezclarlos (D7)", async () => {
    await obtenerPublicacionesActivas({ orden: "precio-desc" });

    const consulta = consultaDeIds();
    expect(consulta.sql).not.toContain('"currency"::text = ?');
    expect(consulta.sql).toContain('ORDER BY "currency" ASC, "price" DESC');
  });

  it("filtra por departamento o localidad sin interpretar comodines (RF-15)", async () => {
    await obtenerPublicacionesActivas({ localidad: " 9_de Julio% " });

    const consulta = consultaDeIds();
    expect(consulta.sql).toContain('"city" ILIKE ?');
    expect(consulta.values).toContain("%9\\_de Julio\\%%");
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

describe("monedaEfectiva (D7)", () => {
  it("respeta la moneda elegida, usa pesos si hay rango y nada si no hay rango", () => {
    expect(monedaEfectiva({ moneda: "USD", minPrecio: 1 })).toBe("USD");
    expect(monedaEfectiva({ minPrecio: 1 })).toBe("ARS");
    expect(monedaEfectiva({})).toBeUndefined();
  });
});
