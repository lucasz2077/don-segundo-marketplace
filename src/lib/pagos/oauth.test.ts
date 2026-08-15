import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  oauthCreate: vi.fn(),
  oauthRefresh: vi.fn(),
  configCreado: vi.fn(),
  upsertCuenta: vi.fn(),
  findFirstCuenta: vi.fn(),
  updateCuenta: vi.fn(),
  crearNotificacion: vi.fn(),
}));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {
    accessToken: string;
    constructor(config: { accessToken: string }) {
      this.accessToken = config.accessToken;
      mocks.configCreado(config.accessToken);
    }
  },
  OAuth: class {
    constructor() {}
    create(args: unknown) {
      return mocks.oauthCreate(args);
    }
    refresh(args: unknown) {
      return mocks.oauthRefresh(args);
    }
    getAuthorizationURL(args: unknown) {
      // TODO: no usado en oauth.ts (la URL se arma en la route, RF-47/4.1)
      void args;
      return "";
    }
  },
}));

vi.mock("@/lib/pagos/mp", () => ({
  clienteMpApp: () => ({ accessToken: "APP_USR-APP" }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    vendedorMpAccount: {
      upsert: mocks.upsertCuenta,
      findFirst: mocks.findFirstCuenta,
      update: mocks.updateCuenta,
    },
  },
}));

vi.mock("@/lib/notificaciones", () => ({
  crearNotificacion: mocks.crearNotificacion,
}));

import {
  completarVinculacionMp,
  obtenerAutorizacionMpUrl,
  obtenerCuentaMpVigente,
  renovarTokenVendedor,
  stateOAuth,
} from "@/lib/pagos/oauth";

const vendedorMp = {
  id: "mp-1",
  userId: "vendedor-1",
  mpUserId: "123456789",
  accessToken: "APP_USR-VIEJO",
  refreshToken: "TG-REFRESH",
  accessTokenExpiresAt: new Date("2026-08-15T12:00:00Z"), // expirado
  liveMode: false,
  revocadaAt: null,
  createdAt: new Date("2026-08-15T00:00:00Z"),
  updatedAt: new Date("2026-08-15T00:00:00Z"),
};

describe("stateOAuth (CSRF, design §5)", () => {
  it("deriva el state del TOKEN de sesión con sha256", () => {
    expect(stateOAuth("tok-sesion")).toBe(
      createHash("sha256").update("tok-sesion").digest("hex")
    );
  });

  it("produce states distintos para tokens de sesión distintos", () => {
    expect(stateOAuth("tok-a")).not.toBe(stateOAuth("tok-b"));
  });
});

describe("obtenerAutorizacionMpUrl (RF-48)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MP_CLIENT_ID", "1234567890");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://campo.example.com");
  });

  it("arma la URL de autorización con client_id, response_type, platform_id, redirect_uri y state", () => {
    const url = obtenerAutorizacionMpUrl("estado-1");

    expect(url).toBe(
      "https://auth.mercadopago.com.ar/authorization?" +
        "client_id=1234567890&response_type=code&platform_id=mp" +
        "&redirect_uri=https%3A%2F%2Fcampo.example.com%2Fapi%2Fpagos%2Foauth%2Fcallback" +
        "&state=estado-1"
    );
  });

  it("lanza si falta MP_CLIENT_ID (la ruta lo traduce a 500)", () => {
    vi.stubEnv("MP_CLIENT_ID", "");

    expect(() => obtenerAutorizacionMpUrl("estado-1")).toThrow(/MP_CLIENT_ID/);
  });
});

describe("completarVinculacionMp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MP_CLIENT_ID", "1234567890");
    vi.stubEnv("MP_CLIENT_SECRET", "SECRETO-APP");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://campo.example.com");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T10:00:00Z"));
  });

  it("intercambia el code por tokens y guarda la cuenta del vendedor (tokens solo server-side)", async () => {
    mocks.oauthCreate.mockResolvedValue({
      access_token: "APP_USR-NUEVO",
      refresh_token: "TG-NUEVO",
      user_id: 987654321,
      live_mode: false,
      expires_in: 1800,
      token_type: "bearer",
    });
    mocks.upsertCuenta.mockResolvedValue({ id: "mp-1", userId: "vendedor-1" });

    await completarVinculacionMp({ userId: "vendedor-1", code: "AUTH-CODE" });

    expect(mocks.oauthCreate).toHaveBeenCalledWith({
      body: {
        client_secret: "SECRETO-APP",
        client_id: "1234567890",
        code: "AUTH-CODE",
        redirect_uri: "https://campo.example.com/api/pagos/oauth/callback",
      },
    });
    expect(mocks.upsertCuenta).toHaveBeenCalledWith({
      where: { userId: "vendedor-1" },
      create: {
        userId: "vendedor-1",
        mpUserId: "987654321", // String(user_id): evita problemas de precisión
        accessToken: "APP_USR-NUEVO",
        refreshToken: "TG-NUEVO",
        accessTokenExpiresAt: new Date("2026-08-15T10:30:00Z"), // now + 1800s
        liveMode: false,
      },
      update: {
        mpUserId: "987654321",
        accessToken: "APP_USR-NUEVO",
        refreshToken: "TG-NUEVO",
        accessTokenExpiresAt: new Date("2026-08-15T10:30:00Z"),
        liveMode: false,
        revocadaAt: null,
      },
    });
  });

  it("revierte la revocación al re-vincular (revocadaAt null en update)", async () => {
    mocks.oauthCreate.mockResolvedValue({
      access_token: "APP_USR-NUEVO",
      refresh_token: "TG-NUEVO",
      user_id: 987654321,
      live_mode: false,
      expires_in: 1800,
    });
    mocks.upsertCuenta.mockResolvedValue({ id: "mp-1" });

    await completarVinculacionMp({ userId: "vendedor-1", code: "AUTH-CODE" });

    expect(mocks.upsertCuenta).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ revocadaAt: null }),
      })
    );
  });
});

describe("obtenerCuentaMpVigente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve la cuenta vigente (no revocada) del vendedor", async () => {
    mocks.findFirstCuenta.mockResolvedValue({ ...vendedorMp, accessToken: "APP_USR-VIGENTE" });

    const cuenta = await obtenerCuentaMpVigente("vendedor-1");

    expect(mocks.findFirstCuenta).toHaveBeenCalledWith({
      where: { userId: "vendedor-1", revocadaAt: null },
    });
    expect(cuenta?.accessToken).toBe("APP_USR-VIGENTE");
  });

  it("devuelve null si la cuenta fue revocada (RF-48)", async () => {
    mocks.findFirstCuenta.mockResolvedValue(null);

    const cuenta = await obtenerCuentaMpVigente("vendedor-1");
    expect(cuenta).toBeNull();
  });
});

describe("renovarTokenVendedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MP_CLIENT_ID", "1234567890");
    vi.stubEnv("MP_CLIENT_SECRET", "SECRETO-APP");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T10:00:00Z"));
  });

  it("renueva el access token con OAuth.refresh y actualiza la cuenta", async () => {
    mocks.oauthRefresh.mockResolvedValue({
      access_token: "APP_USR-RENOVADO",
      refresh_token: "TG-RENOVADO",
      user_id: 123456789,
      live_mode: false,
      expires_in: 3600,
    });
    mocks.updateCuenta.mockResolvedValue({ id: "mp-1" });

    const resultado = await renovarTokenVendedor(vendedorMp);

    expect(mocks.oauthRefresh).toHaveBeenCalledWith({
      body: {
        client_secret: "SECRETO-APP",
        client_id: "1234567890",
        refresh_token: "TG-REFRESH",
      },
    });
    expect(mocks.updateCuenta).toHaveBeenCalledWith({
      where: { id: "mp-1" },
      data: {
        accessToken: "APP_USR-RENOVADO",
        refreshToken: "TG-RENOVADO",
        accessTokenExpiresAt: new Date("2026-08-15T11:00:00Z"), // now + 3600s
      },
    });
    expect(resultado).toEqual({ accessToken: "APP_USR-RENOVADO" });
  });

  it("revoca la cuenta y anula tokens si el refresh falla (RF-48) y notifica al vendedor", async () => {
    mocks.oauthRefresh.mockRejectedValue(new Error("invalid_grant"));
    mocks.updateCuenta.mockResolvedValue({ id: "mp-1" });

    await expect(renovarTokenVendedor(vendedorMp)).rejects.toThrow(
      "No se pudo renovar el token del vendedor"
    );

    expect(mocks.updateCuenta).toHaveBeenCalledWith({
      where: { id: "mp-1" },
      data: {
        // Los tokens se anulan (RNF-20): nunca quedan tokens muertos guardados.
        accessToken: "",
        refreshToken: null,
        revocadaAt: new Date("2026-08-15T10:00:00Z"),
      },
    });
    expect(mocks.crearNotificacion).toHaveBeenCalledWith(
      "vendedor-1",
      null,
      "Vínculo con Mercado Pago expirado",
      expect.stringContaining("re-vincular"),
      "GENERAL",
      expect.objectContaining({ evento: "vinculacion_mp", estado: "REVOCADA" })
    );
  });

  it("no intenta renovar si la cuenta ya está revocada", async () => {
    await expect(
      renovarTokenVendedor({ ...vendedorMp, revocadaAt: new Date("2026-08-15T09:00:00Z") })
    ).rejects.toThrow("No se pudo renovar el token del vendedor");
    expect(mocks.oauthRefresh).not.toHaveBeenCalled();
    expect(mocks.crearNotificacion).not.toHaveBeenCalled();
  });
});