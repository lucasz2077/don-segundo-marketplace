import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
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
}));

import { aCentavos, calcularFee, clienteMpApp, clienteMpVendedor } from "@/lib/pagos/mp";

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

describe("aCentavos", () => {
  it("convierte un Decimal de ARS a entero de centavos sin float", () => {
    expect(aCentavos(new Prisma.Decimal("1500.50"))).toBe(150050);
    expect(aCentavos(new Prisma.Decimal("100"))).toBe(10000);
    expect(aCentavos(new Prisma.Decimal("0.01"))).toBe(1);
    expect(aCentavos(new Prisma.Decimal("0"))).toBe(0);
  });

  it("redondea a 2 decimales antes de convertir a centavos", () => {
    expect(aCentavos(new Prisma.Decimal("1234.567"))).toBe(123457);
    expect(aCentavos(new Prisma.Decimal("9.999"))).toBe(1000);
  });

  it("no usa punto flotante para la conversión (RNF-19)", () => {
    // 0.1 * 100 en float da 10.000000000000002; aCentavos debe dar exactamente 10.
    expect(aCentavos(new Prisma.Decimal("0.1"))).toBe(10);
    // Caso clásico de imprecisión: 29.9 * 100 = 2989.9999999999995 en float.
    expect(aCentavos(new Prisma.Decimal("29.9"))).toBe(2990);
  });
});

describe("calcularFee", () => {
  it("calcula el 5% del precio como Decimal de 2 decimales", () => {
    // Decimal.js normaliza la escala al renderizar (50.00 → "50"); la
    // precisión de 2 decimales queda garantizada por la columna DECIMAL(12,2).
    const fee = calcularFee(new Prisma.Decimal("1000"));
    expect(fee.equals(new Prisma.Decimal("50"))).toBe(true);
    expect(fee.toNumber()).toBe(50);
  });

  it("redondea correctamente montos con decimales", () => {
    // 1234.56 * 0.05 = 61.728 → 61.73
    expect(calcularFee(new Prisma.Decimal("1234.56")).equals(new Prisma.Decimal("61.73"))).toBe(true);
    // 99.99 * 0.05 = 4.9995 → 5.00
    expect(calcularFee(new Prisma.Decimal("99.99")).equals(new Prisma.Decimal("5"))).toBe(true);
  });

  it("devuelve cero para precio cero", () => {
    expect(calcularFee(new Prisma.Decimal("0")).isZero()).toBe(true);
  });

  it("el fee es un Prisma.Decimal (aritmética exacta, sin float)", () => {
    const fee = calcularFee(new Prisma.Decimal("1500.50"));
    expect(fee).toBeInstanceOf(Prisma.Decimal);
    // 1500.50 * 0.05 = 75.025 → 75.03
    expect(fee.equals(new Prisma.Decimal("75.03"))).toBe(true);
  });
});

describe("clienteMpApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-APP");
    // El singleton vive en globalThis (patrón de db/prisma.ts): se reinicia
    // entre tests para aislar la verificación de cache.
    (globalThis as { clienteMpApp?: unknown }).clienteMpApp = undefined;
  });

  it("crea el cliente con MP_ACCESS_TOKEN del entorno", () => {
    const cliente = clienteMpApp();
    expect(mocks.configCreado).toHaveBeenCalledWith("APP_USR-APP");
    expect(cliente.accessToken).toBe("APP_USR-APP");
  });

  it("es singleton: dos llamadas no crean una segunda instancia", () => {
    const primero = clienteMpApp();
    const segundo = clienteMpApp();
    expect(mocks.configCreado).toHaveBeenCalledTimes(1);
    expect(primero).toBe(segundo);
  });
});

describe("clienteMpVendedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea el cliente con el token del VENDEDOR (nunca el de la app)", () => {
    const cliente = clienteMpVendedor(vendedorMp);
    expect(mocks.configCreado).toHaveBeenCalledWith("APP_USR-VENDEDOR");
    expect(cliente.accessToken).toBe("APP_USR-VENDEDOR");
  });
});
