import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getSessionCookie: vi.fn() }));

vi.mock("better-auth/cookies", () => ({
  getSessionCookie: mocks.getSessionCookie,
}));

import { config, proxy } from "./proxy";

describe("proxy (páginas privadas)", () => {
  it("sin sesión redirige a /sign-in conservando ruta y query", () => {
    mocks.getSessionCookie.mockReturnValue(null);

    const respuesta = proxy(new NextRequest("https://ejemplo.com/publicar?id=abc"));

    expect(respuesta.status).toBe(307);
    const destino = new URL(respuesta.headers.get("location")!);
    expect(destino.pathname).toBe("/sign-in");
    expect(destino.searchParams.get("redirect")).toBe("/publicar?id=abc");
  });

  it("con cookie de sesión deja pasar", () => {
    mocks.getSessionCookie.mockReturnValue("token");

    const respuesta = proxy(new NextRequest("https://ejemplo.com/perfil"));

    expect(respuesta.headers.get("location")).toBeNull();
  });

  it.each(["/perfil", "/compras", "/favoritos", "/mensajes", "/notificaciones", "/publicar", "/admin", "/dashboard"])(
    "protege %s",
    (ruta) => {
      expect(config.matcher).toContain(`${ruta}/:path*`);
    }
  );
});
