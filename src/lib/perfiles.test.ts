import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  findManyListings: vi.fn(),
  queryRaw: vi.fn(),
  upsertProfile: vi.fn(),
  findProfile: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUser },
    listing: { findMany: mocks.findManyListings },
    profile: { upsert: mocks.upsertProfile, findUnique: mocks.findProfile },
    $queryRaw: mocks.queryRaw,
  },
}));

import {
  actualizarMiPerfil,
  calcularTiempoRespuestaPromedio,
  formatearTiempoRespuesta,
  obtenerMiPerfil,
  obtenerPerfilPublicoVendedor,
} from "@/lib/perfiles";

const DIA_MS = 24 * 60 * 60 * 1000;

describe("calcularTiempoRespuestaPromedio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve el promedio correcto con 3 o más muestras", async () => {
    mocks.queryRaw.mockResolvedValue([{ muestras: 3, promedioHoras: 12.5 }]);

    const resultado = await calcularTiempoRespuestaPromedio("vendedor-1");

    expect(resultado).toEqual({ promedioHoras: 12.5, muestras: 3 });
  });

  it("devuelve null con solo 2 muestras", async () => {
    mocks.queryRaw.mockResolvedValue([{ muestras: 2, promedioHoras: 8 }]);

    const resultado = await calcularTiempoRespuestaPromedio("vendedor-1");

    expect(resultado).toBeNull();
  });

  it("devuelve null sin muestras", async () => {
    mocks.queryRaw.mockResolvedValue([]);

    const resultado = await calcularTiempoRespuestaPromedio("vendedor-1");

    expect(resultado).toBeNull();
  });

  it("consulta con ventana de 90 días y sin usar readAt (REQ-5)", async () => {
    mocks.queryRaw.mockResolvedValue([{ muestras: 4, promedioHoras: 3 }]);

    await calcularTiempoRespuestaPromedio("vendedor-1");

    const [sql] = mocks.queryRaw.mock.calls[0] as [
      { text: string; values: unknown[] }
    ];
    // Una sola agregación con LATERAL: sin una query por conversación (REQ-11).
    expect(sql.text).toContain("LATERAL");
    // La métrica mide la primera respuesta, no la apertura (REQ-5).
    expect(sql.text).not.toContain("readAt");

    const desde = sql.values.find((v): v is Date => v instanceof Date);
    expect(desde).toBeInstanceOf(Date);
    const diferencia = Date.now() - (desde as Date).getTime();
    expect(diferencia).toBeGreaterThan(89 * DIA_MS);
    expect(diferencia).toBeLessThan(91 * DIA_MS);
  });
});

describe("obtenerPerfilPublicoVendedor", () => {
  const usuarioBase = {
    id: "vendedor-1",
    name: "Juan Pérez",
    image: "https://img.example/avatar.jpg",
    locationLabel: "Santa Fe",
    createdAt: new Date("2025-01-10T00:00:00Z"),
  };

  const publicaciones = [
    {
      id: "lista-1",
      title: "Tractor",
      price: { toString: () => "1500000" },
      currency: "ARS",
      condition: "USED",
      province: "Santa Fe",
      images: [{ url: "https://img.example/tractor.jpg", alt: "Tractor" }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve null si el usuario no existe (REQ-1 → 404)", async () => {
    mocks.findUser.mockResolvedValue(null);

    const resultado = await obtenerPerfilPublicoVendedor("inexistente");

    expect(resultado).toBeNull();
    // No se disparan las queries restantes si no hay usuario.
    expect(mocks.findManyListings).not.toHaveBeenCalled();
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("arma el perfil completo con profile, métrica y publicaciones activas", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuarioBase,
      profile: { bio: "Vendo maquinaria", businessName: "Agro Juan" },
    });
    mocks.queryRaw.mockResolvedValue([{ muestras: 6, promedioHoras: 9.5 }]);
    mocks.findManyListings.mockResolvedValue(publicaciones);

    const resultado = await obtenerPerfilPublicoVendedor("vendedor-1");

    expect(resultado).toEqual({
      usuario: usuarioBase,
      profile: { bio: "Vendo maquinaria", businessName: "Agro Juan" },
      metricaRespuesta: { promedioHoras: 9.5, muestras: 6 },
      publicaciones,
    });
  });

  it("sin Profile: devuelve bio y métrica como null y no consulta la métrica (REQ-3)", async () => {
    mocks.findUser.mockResolvedValue({ ...usuarioBase, profile: null });
    mocks.findManyListings.mockResolvedValue(publicaciones);

    const resultado = await obtenerPerfilPublicoVendedor("vendedor-1");

    expect(resultado?.profile).toBeNull();
    expect(resultado?.metricaRespuesta).toBeNull();
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("filtra publicaciones ACTIVE con stock > 0 y sin soft delete (REQ-4)", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuarioBase,
      profile: { bio: null, businessName: null },
    });
    mocks.queryRaw.mockResolvedValue([{ muestras: 3, promedioHoras: 2 }]);
    mocks.findManyListings.mockResolvedValue(publicaciones);

    await obtenerPerfilPublicoVendedor("vendedor-1");

    expect(mocks.findManyListings).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ownerId: "vendedor-1",
          status: "ACTIVE",
          stock: { gt: 0 },
          deletedAt: null,
        },
      })
    );
  });

  it("no selecciona datos personales del usuario (REQ-12)", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuarioBase,
      email: "juan@example.com",
      phone: "+54 9 342 555-1234",
      dni: "30111222",
      profile: null,
    });
    mocks.findManyListings.mockResolvedValue(publicaciones);

    await obtenerPerfilPublicoVendedor("vendedor-1");

    const [arg] = mocks.findUser.mock.calls[0] as [
      { select: Record<string, unknown> }
    ];
    expect(arg.select.email).toBeUndefined();
    expect(arg.select.phone).toBeUndefined();
    expect(arg.select.dni).toBeUndefined();
  });
});

describe("actualizarMiPerfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea el Profile con upsert cuando no existe (REQ-9)", async () => {
    mocks.upsertProfile.mockResolvedValue({
      id: "perfil-1",
      bio: "Vendo maquinaria",
      businessName: "Agro Juan",
    });

    const resultado = await actualizarMiPerfil("usuario-1", {
      bio: "Vendo maquinaria",
      businessName: "Agro Juan",
    });

    expect(mocks.upsertProfile).toHaveBeenCalledWith({
      where: { userId: "usuario-1" },
      create: {
        userId: "usuario-1",
        bio: "Vendo maquinaria",
        businessName: "Agro Juan",
      },
      update: {
        bio: "Vendo maquinaria",
        businessName: "Agro Juan",
      },
      select: { id: true, bio: true, businessName: true },
    });
    expect(resultado).toEqual({
      id: "perfil-1",
      bio: "Vendo maquinaria",
      businessName: "Agro Juan",
    });
  });

  it("actualiza el Profile existente con solo los campos enviados", async () => {
    mocks.upsertProfile.mockResolvedValue({
      id: "perfil-1",
      bio: "Nueva bio",
      businessName: "Agro Juan",
    });

    await actualizarMiPerfil("usuario-1", { bio: "Nueva bio" });

    expect(mocks.upsertProfile).toHaveBeenCalledWith({
      where: { userId: "usuario-1" },
      create: {
        userId: "usuario-1",
        bio: "Nueva bio",
        businessName: null,
      },
      update: { bio: "Nueva bio" },
      select: { id: true, bio: true, businessName: true },
    });
  });
});

describe("obtenerMiPerfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve bio y businessName cuando el Profile existe", async () => {
    mocks.findProfile.mockResolvedValue({
      bio: "Vendo maquinaria",
      businessName: "Agro Juan",
    });

    const resultado = await obtenerMiPerfil("usuario-1");

    expect(resultado).toEqual({
      bio: "Vendo maquinaria",
      businessName: "Agro Juan",
    });
  });

  it("devuelve campos null cuando no existe el Profile", async () => {
    mocks.findProfile.mockResolvedValue(null);

    const resultado = await obtenerMiPerfil("usuario-1");

    expect(resultado).toEqual({ bio: null, businessName: null });
  });
});

describe("formatearTiempoRespuesta", () => {
  it("formatea menos de 1 hora como '< 1 h'", () => {
    expect(formatearTiempoRespuesta(0.5)).toBe("< 1 h");
  });

  it("formatea horas redondeadas hacia arriba", () => {
    expect(formatearTiempoRespuesta(2)).toBe("~2 h");
    expect(formatearTiempoRespuesta(23.1)).toBe("~24 h");
  });

  it("formatea días entre 24 y 168 horas", () => {
    expect(formatearTiempoRespuesta(24)).toBe("~1 día");
    expect(formatearTiempoRespuesta(48)).toBe("~2 días");
    expect(formatearTiempoRespuesta(72)).toBe("~3 días");
  });

  it("formatea semanas desde 168 horas", () => {
    expect(formatearTiempoRespuesta(168)).toBe("~1 semana");
    expect(formatearTiempoRespuesta(336)).toBe("~2 semanas");
  });
});