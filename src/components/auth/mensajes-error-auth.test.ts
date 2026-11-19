import { describe, expect, it } from "vitest";
import { mensajeErrorAuth } from "./mensajes-error-auth";

describe("mensajeErrorAuth", () => {
  it("traduce los códigos conocidos de Better Auth", () => {
    expect(
      mensajeErrorAuth({ code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }, "x"),
    ).toBe("El email o la contraseña no son correctos.");
  });

  it("usa el respaldo ante códigos desconocidos o sin error", () => {
    expect(mensajeErrorAuth({ code: "ALGO_NUEVO", message: "Something" }, "No se pudo ingresar")).toBe(
      "No se pudo ingresar",
    );
    expect(mensajeErrorAuth(null, "No se pudo ingresar")).toBe("No se pudo ingresar");
  });

  it("traduce el 429 del límite de intentos aunque no traiga código (RNF-07)", () => {
    expect(
      mensajeErrorAuth({ status: 429, message: "Too many requests. Please try again later." }, "x"),
    ).toBe("Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.");
  });
});
