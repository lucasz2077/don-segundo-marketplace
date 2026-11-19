import { describe, expect, it } from "vitest";

import { configuracionRateLimit, encabezadosIp } from "./limites-auth";

describe("configuracionRateLimit (RNF-07)", () => {
  it("guarda los contadores en la base, no en memoria (serverless)", () => {
    expect(configuracionRateLimit.storage).toBe("database");
  });

  it("limita el ingreso a 5 intentos por minuto por IP", () => {
    expect(configuracionRateLimit.customRules["/sign-in/email"]).toEqual({ window: 60, max: 5 });
  });

  it("limita registro y recuperación de contraseña por hora", () => {
    expect(configuracionRateLimit.customRules["/sign-up/email"]).toEqual({ window: 3600, max: 5 });
    expect(configuracionRateLimit.customRules["/request-password-reset"]).toEqual({
      window: 3600,
      max: 3,
    });
  });

  it("no limita la consulta de sesión (se pide en cada navegación)", () => {
    expect(configuracionRateLimit.customRules["/get-session"]).toBe(false);
  });

  it("toma la IP de los encabezados que completa Vercel", () => {
    expect(encabezadosIp).toEqual(["x-real-ip", "x-forwarded-for"]);
  });
});
