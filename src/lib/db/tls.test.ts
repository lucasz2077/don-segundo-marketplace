import { describe, expect, it } from "vitest";

import { normalizarPem, opcionesTls } from "./tls";

const PEM = ["-----BEGIN CERTIFICATE-----", "MIIBszCCAVmgAwIBAgIUabc", "-----END CERTIFICATE-----"].join("\n");

describe("opcionesTls", () => {
  it("sin DATABASE_CA_CERT mantiene la conexión cifrada sin verificar", () => {
    expect(opcionesTls({})).toEqual({ rejectUnauthorized: false });
  });

  it("con la CA de Supabase verifica el certificado del servidor", () => {
    expect(opcionesTls({ DATABASE_CA_CERT: PEM })).toEqual({
      ca: `${PEM}\n`,
      rejectUnauthorized: true,
    });
  });

  it("un valor que no es un certificado no activa la verificación", () => {
    expect(opcionesTls({ DATABASE_CA_CERT: "cualquier cosa" })).toEqual({
      rejectUnauthorized: false,
    });
  });
});

describe("normalizarPem", () => {
  it("acepta saltos de línea escritos como \\n y quita comillas", () => {
    const pegado = `"${PEM.replace(/\n/g, "\\n")}"`;
    expect(normalizarPem(pegado)).toBe(`${PEM}\n`);
  });

  it("devuelve undefined si falta la variable", () => {
    expect(normalizarPem(undefined)).toBeUndefined();
  });
});
