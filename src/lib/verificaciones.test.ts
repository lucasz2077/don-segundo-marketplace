import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueUser: vi.fn(),
  findFirstSolicitud: vi.fn(),
  findUniqueSolicitud: vi.fn(),
  createSolicitud: vi.fn(),
  upsertProfile: vi.fn(),
  esAdministrador: vi.fn(),
  crearNotificacion: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => {
  const prisma = {
    user: { findUnique: mocks.findUniqueUser },
    solicitudVerificacion: {
      findFirst: mocks.findFirstSolicitud,
      findUnique: mocks.findUniqueSolicitud,
      create: mocks.createSolicitud,
    },
    profile: { upsert: mocks.upsertProfile },
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma };
});

vi.mock("@/lib/reportes", () => ({ esAdministrador: mocks.esAdministrador }));

vi.mock("@/lib/notificaciones", () => ({ crearNotificacion: mocks.crearNotificacion }));

import {
  DocumentoInvalidoError,
  obtenerDocumentoVerificacion,
  obtenerSolicitudVerificacionDetalle,
  SinPermisoVerificacionError,
  solicitarVerificacion,
} from "@/lib/verificaciones";

const DNI_PROPIO = "don-segundo-verificaciones/vendedor-1/dni";
const DOMICILIO_PROPIO = "don-segundo-verificaciones/vendedor-1/domicilio";

describe("solicitarVerificacion — documentos privados (RNF-15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUniqueUser.mockResolvedValue({ accountType: "SELLER" });
    mocks.findFirstSolicitud.mockResolvedValue(null);
    mocks.createSolicitud.mockResolvedValue({ id: "sol-1" });
  });

  it("guarda solo los public_id de documentos subidos por el vendedor", async () => {
    const resultado = await solicitarVerificacion({
      vendedorId: "vendedor-1",
      dniPublicId: DNI_PROPIO,
      domicilioPublicId: DOMICILIO_PROPIO,
    });

    expect(resultado).toEqual({ id: "sol-1", estado: "PENDING" });
    expect(mocks.createSolicitud).toHaveBeenCalledWith({
      data: {
        vendedorId: "vendedor-1",
        dniPublicId: DNI_PROPIO,
        domicilioPublicId: DOMICILIO_PROPIO,
      },
      select: { id: true },
    });
  });

  it("rechaza un documento de otro usuario sin crear la solicitud", async () => {
    await expect(
      solicitarVerificacion({
        vendedorId: "vendedor-1",
        dniPublicId: "don-segundo-verificaciones/otro-usuario/dni",
      })
    ).rejects.toBeInstanceOf(DocumentoInvalidoError);

    await expect(
      solicitarVerificacion({
        vendedorId: "vendedor-1",
        dniPublicId: DNI_PROPIO,
        domicilioPublicId: "don-segundo-verificaciones/otro-usuario/domicilio",
      })
    ).rejects.toBeInstanceOf(DocumentoInvalidoError);

    expect(mocks.createSolicitud).not.toHaveBeenCalled();
    expect(mocks.upsertProfile).not.toHaveBeenCalled();
  });

  it("rechaza la solicitud sin documento de identidad", async () => {
    await expect(
      solicitarVerificacion({ vendedorId: "vendedor-1", dniPublicId: "  " })
    ).rejects.toBeInstanceOf(DocumentoInvalidoError);
    expect(mocks.createSolicitud).not.toHaveBeenCalled();
  });
});

const filaSolicitud = {
  id: "sol-1",
  dniUrl: null,
  domicilioUrl: "https://res.cloudinary.com/c/image/upload/v1/don-segundo/legado.jpg",
  dniPublicId: DNI_PROPIO,
  domicilioPublicId: null,
  estado: "PENDING",
  motivoRechazo: null,
  adminId: null,
  revisadoAt: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  vendedor: { name: "Ana", email: "ana@example.com" },
  admin: null,
};

describe("Panel admin de verificaciones (RNF-15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.esAdministrador.mockResolvedValue(true);
    mocks.findUniqueSolicitud.mockResolvedValue(filaSolicitud);
  });

  it("el detalle indica qué documentos hay sin exponer URLs ni public_id", async () => {
    const detalle = await obtenerSolicitudVerificacionDetalle({
      adminId: "admin-1",
      solicitudId: "sol-1",
    });

    expect(detalle).toMatchObject({ tieneDni: true, tieneDomicilio: true });
    expect(JSON.stringify(detalle)).not.toContain("cloudinary");
    expect(JSON.stringify(detalle)).not.toContain(DNI_PROPIO);
  });

  it("obtenerDocumentoVerificacion devuelve el asset privado o la URL legada", async () => {
    await expect(
      obtenerDocumentoVerificacion({ adminId: "admin-1", solicitudId: "sol-1", tipo: "dni" })
    ).resolves.toEqual({ tipo: "privado", publicId: DNI_PROPIO });

    await expect(
      obtenerDocumentoVerificacion({
        adminId: "admin-1",
        solicitudId: "sol-1",
        tipo: "domicilio",
      })
    ).resolves.toEqual({ tipo: "legado", url: filaSolicitud.domicilioUrl });
  });

  it("obtenerDocumentoVerificacion rechaza a quien no es admin en la base", async () => {
    mocks.esAdministrador.mockResolvedValue(false);

    await expect(
      obtenerDocumentoVerificacion({ adminId: "u1", solicitudId: "sol-1", tipo: "dni" })
    ).rejects.toBeInstanceOf(SinPermisoVerificacionError);
    expect(mocks.findUniqueSolicitud).not.toHaveBeenCalled();
  });
});
