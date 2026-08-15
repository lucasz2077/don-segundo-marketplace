import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  preferenceCreate: vi.fn(),
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
  Preference: class {
    constructor() {}
    create(args: unknown) {
      return mocks.preferenceCreate(args);
    }
  },
}));

vi.mock("@/lib/pagos/mp", async (importActual) => {
  const real = await importActual<typeof import("@/lib/pagos/mp")>();
  return {
    // aCentavos es una función pura sin SDK: se usa la implementación real.
    aCentavos: real.aCentavos,
    clienteMpVendedor: (vendedorMp: { accessToken: string }) => {
      mocks.configCreado(vendedorMp.accessToken);
      return { accessToken: vendedorMp.accessToken };
    },
  };
});

import {
  crearPreferenciaPago,
  PreferenciaFallidaError,
} from "@/lib/pagos/preferencias";

const vendedorMp = {
  id: "mp-1",
  userId: "vendedor-1",
  mpUserId: "123456789",
  accessToken: "APP_USR-VENDEDOR",
  refreshToken: "TG-REFRESH",
  accessTokenExpiresAt: new Date("2026-08-16T00:00:00Z"),
  liveMode: false,
  revocadaAt: null,
  createdAt: new Date("2026-08-15T00:00:00Z"),
  updatedAt: new Date("2026-08-15T00:00:00Z"),
};

const compra = {
  id: "compra-1",
  compradorId: "comprador-1",
  listingId: "lista-1",
  precioUnitario: new Prisma.Decimal("1500.50"),
  currency: "ARS" as const,
  cantidad: 1,
  estadoPago: "PENDIENTE" as const,
  fechaVencimiento: new Date("2026-08-15T12:30:00Z"),
  marketplaceFee: new Prisma.Decimal("75.03"),
  mpPreferenceId: null,
  mpPaymentId: null,
  aprobadoAt: null,
  medioPago: null,
  reembolsadoAt: null,
  motivoReembolso: null,
  createdAt: new Date("2026-08-15T12:00:00Z"),
};

describe("crearPreferenciaPago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://campo.example.com");
  });

  it("crea la preferencia con el token del VENDEDOR y devuelve el init_point", async () => {
    mocks.preferenceCreate.mockResolvedValue({
      id: "12345678",
      init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=12345678",
    });

    const resultado = await crearPreferenciaPago({ compra, vendedorMp });

    expect(mocks.configCreado).toHaveBeenCalledWith("APP_USR-VENDEDOR");
    expect(resultado).toEqual({
      initPoint: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=12345678",
    });
  });

  it("arma el body completo de la preferencia (RF-39: items, back_urls, fee, expiración, webhook)", async () => {
    mocks.preferenceCreate.mockResolvedValue({ id: "12345678", init_point: "https://mp.example/init" });

    await crearPreferenciaPago({ compra, vendedorMp });

    expect(mocks.preferenceCreate).toHaveBeenCalledWith({
      body: {
        items: [
          {
            id: "lista-1",
            title: "compra-1",
            quantity: 1,
            unit_price: 150050, // aCentavos(1500.50): entero de centavos, sin float
            currency_id: "ARS",
          },
        ],
        external_reference: "compra-1",
        back_urls: {
          success: "https://campo.example.com/pagos/resultado?compra=compra-1&estado=success",
          failure: "https://campo.example.com/pagos/resultado?compra=compra-1&estado=failure",
          pending: "https://campo.example.com/pagos/resultado?compra=compra-1&estado=pending",
        },
        marketplace_fee: 7503, // aCentavos(75.03)
        auto_return: "approved",
        expires: true,
        date_of_expiration: new Date("2026-08-15T12:30:00Z").toISOString(),
        notification_url: "https://campo.example.com/api/pagos/webhook",
      },
    });
  });

  it("omite auto_return cuando la app base es http (MP exige https para retorno automático)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    mocks.preferenceCreate.mockResolvedValue({ id: "12345678", init_point: "https://mp.example/init" });

    await crearPreferenciaPago({ compra, vendedorMp });

    const llamado = mocks.preferenceCreate.mock.calls[0][0] as { body: Record<string, unknown> };
    expect(llamado.body.auto_return).toBeUndefined();
    expect(llamado.body.expires).toBe(true);
    expect(llamado.body.date_of_expiration).toBe(
      new Date("2026-08-15T12:30:00Z").toISOString()
    );
  });

  it("lanza PreferenciaFallidaError cuando Mercado Pago rechaza la preferencia", async () => {
    mocks.preferenceCreate.mockRejectedValue(new Error("invalid marketplace_fee"));

    await expect(crearPreferenciaPago({ compra, vendedorMp })).rejects.toThrow(
      PreferenciaFallidaError
    );
  });
});