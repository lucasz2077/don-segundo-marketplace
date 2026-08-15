import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  paymentGet: vi.fn(),
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
  Payment: class {
    constructor() {}
    get(args: unknown) {
      return mocks.paymentGet(args);
    }
  },
}));

vi.mock("@/lib/pagos/mp", () => ({
  clienteMpApp: () => ({ accessToken: "APP_USR-APP" }),
}));

import { verificarPago } from "@/lib/pagos/pagos";

describe("verificarPago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta Payment.get con el token de la APP y devuelve los datos verificados", async () => {
    mocks.paymentGet.mockResolvedValue({
      id: 12345678,
      status: "approved",
      external_reference: "compra-1",
      transaction_amount: 1500.5,
      currency_id: "ARS",
      payment_method_id: "visa",
    });

    const pago = await verificarPago("12345678");

    expect(mocks.paymentGet).toHaveBeenCalledWith({ id: "12345678" });
    expect(pago).toEqual({
      id: 12345678,
      status: "approved",
      externalReference: "compra-1",
      transactionAmount: new Prisma.Decimal("1500.50"),
      currencyId: "ARS",
      paymentMethodId: "visa",
    });
  });

  it("convierte transaction_amount a Prisma.Decimal exacto sin float", async () => {
    mocks.paymentGet.mockResolvedValue({
      id: 1,
      status: "approved",
      external_reference: "compra-1",
      transaction_amount: 0.1,
      currency_id: "ARS",
      payment_method_id: "visa",
    });

    const pago = await verificarPago("1");

    expect(pago?.transactionAmount.equals(new Prisma.Decimal("0.10"))).toBe(true);
  });

  it("devuelve null cuando no hay external_reference (pago no relacionado)", async () => {
    mocks.paymentGet.mockResolvedValue({
      id: 2,
      status: "approved",
      external_reference: undefined,
      transaction_amount: 100,
      currency_id: "ARS",
    });

    const pago = await verificarPago("2");
    expect(pago).toBeNull();
  });

  it("rechaza si la confirmación server-side falla (RNF-16)", async () => {
    mocks.paymentGet.mockRejectedValue(new Error("MP 503"));

    await expect(verificarPago("3")).rejects.toThrow("MP 503");
  });
});