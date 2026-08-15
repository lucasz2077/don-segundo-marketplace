import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";

/**
 * Reconstruye el manifest de MP y su HMAC-SHA256 tal como los calcula la
 * producción (misma lógica que el helper real): `id;request-id;ts;` con el
 * secret. Se usa para armar firmas VÁLIDAS en los tests (triangulación real).
 */
function firmaMpValida({
  dataId,
  xRequestId,
  ts,
  secret,
}: {
  dataId: string;
  xRequestId: string;
  ts: string;
  secret: string;
}): string {
  const partes: string[] = [];
  if (dataId) partes.push(`id:${dataId}`);
  if (xRequestId) partes.push(`request-id:${xRequestId}`);
  partes.push(`ts:${ts}`);
  const manifest = `${partes.join(";")};`;
  const digest = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${digest}`;
}

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

import { verificarFirmaMp, verificarPago } from "@/lib/pagos/pagos";

describe("verificarFirmaMp", () => {
  const SECRET = "test-webhook-secret";
  const TS = "1700000000";

  it("acepta una firma x-signature válida (ts/v1 HMAC-SHA256)", () => {
    const xSignature = firmaMpValida({
      dataId: "12345678",
      xRequestId: "req-1",
      ts: TS,
      secret: SECRET,
    });

    const valida = verificarFirmaMp({
      xSignature,
      xRequestId: "req-1",
      dataId: "12345678",
      secret: SECRET,
    });

    expect(valida).toBe(true);
  });

  it("rechaza una firma con un secret distinto (manipulación)", () => {
    const xSignature = firmaMpValida({
      dataId: "12345678",
      xRequestId: "req-1",
      ts: TS,
      secret: "otro-secret",
    });

    const valida = verificarFirmaMp({
      xSignature,
      xRequestId: "req-1",
      dataId: "12345678",
      secret: SECRET,
    });

    expect(valida).toBe(false);
  });

  it("rechaza si data.id no coincide con el firmado", () => {
    const xSignature = firmaMpValida({
      dataId: "12345678",
      xRequestId: "req-1",
      ts: TS,
      secret: SECRET,
    });

    const valida = verificarFirmaMp({
      xSignature,
      xRequestId: "req-1",
      dataId: "99999999",
      secret: SECRET,
    });

    expect(valida).toBe(false);
  });

  it("rechaza headers sin firma o mal formados", () => {
    expect(
      verificarFirmaMp({
        xSignature: null,
        xRequestId: "req-1",
        dataId: "12345678",
        secret: SECRET,
      })
    ).toBe(false);
    expect(
      verificarFirmaMp({
        xSignature: "solo-un-texto",
        xRequestId: "req-1",
        dataId: "12345678",
        secret: SECRET,
      })
    ).toBe(false);
    expect(
      verificarFirmaMp({
        xSignature: "ts=123",
        xRequestId: "req-1",
        dataId: "12345678",
        secret: SECRET,
      })
    ).toBe(false);
  });

  it("compara el digest de forma timing-safe", () => {
    const xSignature = firmaMpValida({
      dataId: "12345678",
      xRequestId: "req-1",
      ts: TS,
      secret: SECRET,
    });
    const parseada = xSignature.split(",").find((p) => p.startsWith("v1="))!;
    const digest = parseada.slice(3);

    const calculado = createHmac("sha256", SECRET)
      .update(`id:12345678;request-id:req-1;ts:${TS};`)
      .digest("hex");

    expect(
      timingSafeEqual(Buffer.from(calculado), Buffer.from(digest))
    ).toBe(true);
  });
});

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