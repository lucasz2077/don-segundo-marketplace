import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  findFirstListing: vi.fn(),
  updateListing: vi.fn(),
  updateManyListing: vi.fn(),
  findUniqueListing: vi.fn(),
  findFirstModerationAction: vi.fn(),
  findUniqueCompra: vi.fn(),
  updateCompra: vi.fn(),
  updateManyCompra: vi.fn(),
  findUniqueSolicitud: vi.fn(),
  updateSolicitud: vi.fn(),
  updateManySolicitud: vi.fn(),
  crearNotificacion: vi.fn(),
  notificarFavoritosCambioPublicacion: vi.fn(),
  obtenerTokenVendedor: vi.fn(),
  reembolsarCompra: vi.fn(),
  verificarPago: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => {
  const prisma = {
    listing: {
      findFirst: mocks.findFirstListing,
      findUnique: mocks.findUniqueListing,
      update: mocks.updateListing,
      updateMany: mocks.updateManyListing,
    },
    moderationAction: { findFirst: mocks.findFirstModerationAction },
    compra: {
      findUnique: mocks.findUniqueCompra,
      update: mocks.updateCompra,
      updateMany: mocks.updateManyCompra,
    },
    solicitudDevolucion: {
      findUnique: mocks.findUniqueSolicitud,
      update: mocks.updateSolicitud,
      updateMany: mocks.updateManySolicitud,
    },
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma };
});

vi.mock("@/lib/notificaciones", () => ({
  crearNotificacion: mocks.crearNotificacion,
  notificarCambioEstadoPublicacion: vi.fn(),
  notificarFavoritosCambioPublicacion: mocks.notificarFavoritosCambioPublicacion,
}));

vi.mock("@/lib/pagos/oauth", () => ({
  obtenerTokenVendedor: mocks.obtenerTokenVendedor,
}));

vi.mock("@/lib/pagos/preferencias", () => ({
  crearPreferenciaPago: vi.fn(),
  PreferenciaFallidaError: class extends Error {},
}));

vi.mock("@/lib/pagos/pagos", () => ({ verificarPago: mocks.verificarPago }));

// Se conserva la clase real de error (el servicio usa `instanceof`).
vi.mock("@/lib/pagos/reembolsos", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/pagos/reembolsos")>();
  return { ...real, reembolsarCompra: mocks.reembolsarCompra };
});

import {
  AccionEstadoInvalidaError,
  aprobarPagoCompra,
  procesarNotificacionPago,
  PublicacionPausadaPorModeracionError,
  reanudarPublicacionPropia,
  resolverDevolucion,
  VendedorSinCuentaMpError,
} from "@/lib/compras";
import { ReembolsoFallidoError } from "@/lib/pagos/reembolsos";

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

const solicitudPendiente = {
  id: "sol-1",
  compraId: "compra-1",
  compradorId: "comprador-1",
  vendedorId: "vendedor-1",
  estado: "PENDIENTE",
  compra: {
    id: "compra-1",
    mpPaymentId: "pago-1",
    precioUnitario: new Prisma.Decimal("1500.50"),
    listing: { id: "l1", ownerId: "vendedor-1", title: "Tractor usado" },
    comprador: { name: "Ana" },
  },
};

describe("resolverDevolucion — aprobar (RF-49..RF-51)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUniqueSolicitud.mockResolvedValue(solicitudPendiente);
    mocks.obtenerTokenVendedor.mockResolvedValue("APP_USR-VENDEDOR");
    mocks.updateManySolicitud.mockResolvedValue({ count: 1 });
  });

  it("reembolsa con el token del vendedor y recién entonces marca la compra REEMBOLSADO", async () => {
    mocks.reembolsarCompra.mockResolvedValue({ mpRefundId: 777 });

    const resultado = await resolverDevolucion({
      vendedorId: "vendedor-1",
      solicitudId: "sol-1",
      accion: "aprobar",
    });

    expect(resultado).toEqual({ solicitud: { id: "sol-1", estado: "APROBADA" } });
    expect(mocks.reembolsarCompra).toHaveBeenCalledWith({
      compra: { id: "compra-1", mpPaymentId: "pago-1" },
      accessTokenVendedor: "APP_USR-VENDEDOR",
      idempotencia: "devolucion-sol-1",
    });
    expect(mocks.updateSolicitud).toHaveBeenCalledWith({
      where: { id: "sol-1" },
      data: { mpRefundId: "777", montoReembolsado: solicitudPendiente.compra.precioUnitario },
    });
    expect(mocks.updateCompra).toHaveBeenCalledWith({
      where: { id: "compra-1" },
      data: expect.objectContaining({
        estadoPago: "REEMBOLSADO",
        motivoReembolso: "DEVOLUCION_VENDEDOR",
      }),
    });
  });

  it("si el refund falla, la solicitud vuelve a PENDIENTE y la compra no se toca", async () => {
    mocks.reembolsarCompra.mockRejectedValue(new ReembolsoFallidoError(new Error("MP 503")));

    await expect(
      resolverDevolucion({ vendedorId: "vendedor-1", solicitudId: "sol-1", accion: "aprobar" })
    ).rejects.toBeInstanceOf(ReembolsoFallidoError);

    expect(mocks.updateManySolicitud).toHaveBeenLastCalledWith({
      where: { id: "sol-1", estado: "APROBADA", mpRefundId: null },
      data: { estado: "PENDIENTE", resueltaAt: null },
    });
    expect(mocks.updateCompra).not.toHaveBeenCalled();
    expect(mocks.crearNotificacion).not.toHaveBeenCalled();
  });

  it("sin cuenta de MP vigente del vendedor no toca nada", async () => {
    mocks.obtenerTokenVendedor.mockResolvedValue(null);

    await expect(
      resolverDevolucion({ vendedorId: "vendedor-1", solicitudId: "sol-1", accion: "aprobar" })
    ).rejects.toBeInstanceOf(VendedorSinCuentaMpError);

    expect(mocks.updateManySolicitud).not.toHaveBeenCalled();
    expect(mocks.reembolsarCompra).not.toHaveBeenCalled();
  });
});

const pagoAprobado = {
  id: 555,
  status: "approved",
  externalReference: "compra-1",
  transactionAmount: new Prisma.Decimal("1500.50"),
  currencyId: "ARS",
  paymentMethodId: "visa",
};

const compraPendiente = {
  id: "compra-1",
  compradorId: "comprador-1",
  listingId: "l1",
  precioUnitario: new Prisma.Decimal("1500.50"),
  currency: "ARS",
  listing: { id: "l1", ownerId: "vendedor-1", title: "Tractor usado" },
};

describe("aprobarPagoCompra — carrera sin stock (D4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateManyCompra.mockResolvedValue({ count: 1 });
    mocks.updateManyListing.mockResolvedValue({ count: 0 });
    mocks.obtenerTokenVendedor.mockResolvedValue("APP_USR-VENDEDOR");
  });

  it("deja la compra en REEMBOLSO_PENDIENTE dentro de la tx y la reembolsa después", async () => {
    mocks.findUniqueCompra
      .mockResolvedValueOnce(compraPendiente)
      .mockResolvedValueOnce({
        id: "compra-1",
        compradorId: "comprador-1",
        listingId: "l1",
        estadoPago: "REEMBOLSO_PENDIENTE",
        mpPaymentId: "555",
        listing: { ownerId: "vendedor-1", title: "Tractor usado" },
      });
    mocks.reembolsarCompra.mockResolvedValue({ mpRefundId: 888 });

    const resultado = await aprobarPagoCompra({ externalReference: "compra-1", pago: pagoAprobado });

    expect(resultado).toEqual({ procesada: true, sinStock: true, pasoASold: false });
    expect(mocks.updateCompra).toHaveBeenCalledWith({
      where: { id: "compra-1" },
      data: { estadoPago: "REEMBOLSO_PENDIENTE", motivoReembolso: "SIN_STOCK" },
    });
    expect(mocks.reembolsarCompra).toHaveBeenCalledWith({
      compra: { id: "compra-1", mpPaymentId: "555" },
      accessTokenVendedor: "APP_USR-VENDEDOR",
      idempotencia: "sin-stock-compra-1",
    });
    expect(mocks.updateManyCompra).toHaveBeenLastCalledWith({
      where: { id: "compra-1", estadoPago: "REEMBOLSO_PENDIENTE" },
      data: expect.objectContaining({ estadoPago: "REEMBOLSADO" }),
    });
  });

  it("si el refund falla, la compra queda REEMBOLSO_PENDIENTE para el reintento", async () => {
    mocks.findUniqueCompra
      .mockResolvedValueOnce(compraPendiente)
      .mockResolvedValueOnce({
        id: "compra-1",
        compradorId: "comprador-1",
        listingId: "l1",
        estadoPago: "REEMBOLSO_PENDIENTE",
        mpPaymentId: "555",
        listing: { ownerId: "vendedor-1", title: "Tractor usado" },
      });
    mocks.reembolsarCompra.mockRejectedValue(new Error("MP 503"));

    await aprobarPagoCompra({ externalReference: "compra-1", pago: pagoAprobado });

    // Solo la toma PENDIENTE→APROBADO: nunca se marca REEMBOLSADO sin refund.
    expect(mocks.updateManyCompra).toHaveBeenCalledTimes(1);
  });
});

describe("procesarNotificacionPago (RF-43, RNF-16)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obtenerTokenVendedor.mockResolvedValue("APP_USR-VENDEDOR");
  });

  it("consulta el pago con el token del vendedor de la compra indicada", async () => {
    mocks.findUniqueCompra.mockResolvedValueOnce({ listing: { ownerId: "vendedor-1" } });
    mocks.verificarPago.mockResolvedValue({ ...pagoAprobado, status: "pending" });

    await procesarNotificacionPago({ mpPaymentId: "555", compraId: "compra-1" });

    expect(mocks.obtenerTokenVendedor).toHaveBeenCalledWith("vendedor-1");
    expect(mocks.verificarPago).toHaveBeenCalledWith("555", "APP_USR-VENDEDOR");
    // Un pago no aprobado no cierra la compra.
    expect(mocks.updateManyCompra).not.toHaveBeenCalled();
  });

  it("ignora el pago si su external_reference no es la compra de la URL", async () => {
    mocks.findUniqueCompra.mockResolvedValueOnce({ listing: { ownerId: "vendedor-1" } });
    mocks.verificarPago.mockResolvedValue({ ...pagoAprobado, externalReference: "otra-compra" });

    await procesarNotificacionPago({ mpPaymentId: "555", compraId: "compra-1" });

    expect(mocks.updateManyCompra).not.toHaveBeenCalled();
  });

  it("sin compra en la URL consulta con el token de la app", async () => {
    mocks.verificarPago.mockResolvedValue(null);

    await procesarNotificacionPago({ mpPaymentId: "555" });

    expect(mocks.obtenerTokenVendedor).not.toHaveBeenCalled();
    expect(mocks.verificarPago).toHaveBeenCalledWith("555", undefined);
  });

  it("propaga el error de MP para que el webhook responda 5xx y MP reintente", async () => {
    mocks.findUniqueCompra.mockResolvedValueOnce({ listing: { ownerId: "vendedor-1" } });
    mocks.verificarPago.mockRejectedValue(new Error("MP 503"));

    await expect(
      procesarNotificacionPago({ mpPaymentId: "555", compraId: "compra-1" })
    ).rejects.toThrow("MP 503");
  });
});
