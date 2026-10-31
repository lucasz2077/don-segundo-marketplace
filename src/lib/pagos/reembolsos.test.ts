import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  refundTotal: vi.fn(),
  configCreado: vi.fn(),
  refundCliente: vi.fn(),
}));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {
    accessToken: string;
    constructor(config: { accessToken: string }) {
      this.accessToken = config.accessToken;
      mocks.configCreado(config.accessToken);
    }
  },
  PaymentRefund: class {
    constructor(cliente: unknown) {
      mocks.refundCliente(cliente);
    }
    total(args: unknown) {
      return mocks.refundTotal(args);
    }
  },
}));

vi.mock("@/lib/pagos/mp", () => ({
  clienteMpVendedor: (cuenta: { accessToken: string }) => ({ accessToken: cuenta.accessToken }),
}));

import {
  ReembolsoFallidoError,
  reembolsarCompra,
} from "@/lib/pagos/reembolsos";

const compraAprobada = {
  id: "compra-1",
  mpPaymentId: "98765432",
  precioUnitario: new Prisma.Decimal("1500.50"),
  currency: "ARS" as const,
  cantidad: 1,
};

describe("reembolsarCompra", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reembolsa el monto COMPLETO pagado por el importe de la compra (RF-51)", async () => {
    mocks.refundTotal.mockResolvedValue({ id: 555, payment_id: 98765432, amount: 1500.5 });

    const resultado = await reembolsarCompra({
      compra: compraAprobada,
      accessTokenVendedor: "APP_USR-VENDEDOR",
      idempotencia: "devolucion-sol-1",
    });

    // RF-51/D4: refund total de la operación. Al usar total() no se pasa
    // monto: MP devuelve el 100% de lo pagado, descontándolo en proporción al
    // vendedor y al marketplace_fee de la plataforma. Se ejecuta con el token
    // del vendedor (dueño del pago) y una clave de idempotencia estable.
    expect(mocks.refundCliente).toHaveBeenCalledWith({ accessToken: "APP_USR-VENDEDOR" });
    expect(mocks.refundTotal).toHaveBeenCalledWith({
      payment_id: "98765432",
      requestOptions: { idempotencyKey: "devolucion-sol-1" },
    });
    expect(resultado).toEqual({ mpRefundId: 555 });
  });

  it("lanza ReembolsoFallidoError cuando MP rechaza el refund", async () => {
    mocks.refundTotal.mockRejectedValue(new Error("refund no permitido"));

    await expect(
      reembolsarCompra({
        compra: compraAprobada,
        accessTokenVendedor: "APP_USR-VENDEDOR",
        idempotencia: "devolucion-sol-1",
      })
    ).rejects.toThrow(
      ReembolsoFallidoError
    );
  });

  it("lanza ReembolsoFallidoError si la compra no tiene mpPaymentId", async () => {
    await expect(
      reembolsarCompra({
        compra: { ...compraAprobada, mpPaymentId: null },
        accessTokenVendedor: "APP_USR-VENDEDOR",
        idempotencia: "devolucion-sol-1",
      })
    ).rejects.toThrow(ReembolsoFallidoError);
    expect(mocks.refundTotal).not.toHaveBeenCalled();
  });
});