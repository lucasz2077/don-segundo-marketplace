import { describe, expect, it } from "vitest";

import { origenesConfiables } from "./origenes-confiables";

const BASE = "https://don-segundo-marketplace.vercel.app";

describe("origenesConfiables (trustedOrigins de Better Auth)", () => {
  it("en producción no acepta el comodín *.vercel.app", () => {
    const origenes = origenesConfiables(BASE, { NODE_ENV: "production" });

    expect(origenes).toEqual([BASE]);
    expect(origenes.some((origen) => origen.includes("*"))).toBe(false);
  });

  it("suma las URLs del propio deploy de Vercel (previews) sin duplicar", () => {
    const origenes = origenesConfiables(BASE, {
      NODE_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "don-segundo-marketplace.vercel.app",
      VERCEL_BRANCH_URL: "don-segundo-marketplace-git-rama-equipo.vercel.app",
      VERCEL_URL: "don-segundo-marketplace-abc123-equipo.vercel.app",
    });

    expect(origenes).toEqual([
      BASE,
      "https://don-segundo-marketplace-git-rama-equipo.vercel.app",
      "https://don-segundo-marketplace-abc123-equipo.vercel.app",
    ]);
  });

  it("ignora variables vacías", () => {
    expect(
      origenesConfiables(BASE, { NODE_ENV: "production", VERCEL_URL: "  ", VERCEL_BRANCH_URL: "" })
    ).toEqual([BASE]);
  });

  it("en desarrollo acepta localhost y la red local", () => {
    const origenes = origenesConfiables("http://localhost:3000", { NODE_ENV: "development" });

    expect(origenes).toContain("http://localhost:3000");
    expect(origenes).toContain("http://192.168.*:3000");
    expect(origenes.some((origen) => origen.includes("vercel.app"))).toBe(false);
  });
});
