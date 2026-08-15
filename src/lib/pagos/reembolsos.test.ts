import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  refundTotal: vi.fn(),
  configCreado: vi.fn(),
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
    constructor() {}
    total(args: unknown) {
      return mocks.refundTotal(args);
    }
  },
}));

vi.mock("@/lib/pagos/mp", () => ({
  clienteMpApp: () => ({ accessToken: "APP_USR-APP" }),
  aCentavos: (precio: Prisma.Decimal) => precio.mul(100).toNumber(),
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

    const resultado = await reembolsarCompra({ compra: compraAprobada });

    // RF-51/D4: refund total de la operación; el vendedor absorbe el fee.
    // Al usar total() no se pasa monto: MP devuelve el 100% de lo pagado.
    expect(mocks.refundTotal).toHaveBeenCalledWith({ payment_id: "98765432" });
    expect(resultado).toEqual({ mpRefundId: 555 });
  });

  it("lanza ReembolsoFallidoError cuando MP rechaza el refund", async () => {
    mocks.refundTotal.mockRejectedValue(new Error("refund no permitido"));

    await expect(reembolsarCompra({ compra: compraAprobada })).rejects.toThrow(
      ReembolsoFallidoError
    );
  });

  it("lanza ReembolsoFallidoError si la compra no tiene mpPaymentId", async () => {
    await expect(
      reembolsarCompra({ compra: { ...compraAprobada, mpPaymentId: null } })
    ).rejects.toThrow(ReembolsoFallidoError);
    expect(mocks.refundTotal).not.toHaveBeenCalled();
  });
});