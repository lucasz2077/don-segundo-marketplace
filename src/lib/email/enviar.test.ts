import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emailConfigurado, enviarEmail } from "./enviar";

const mensaje = {
  para: "ana@ejemplo.com",
  asunto: "Asunto de prueba",
  html: "<p>Hola</p>",
  texto: "Hola",
};

describe("enviarEmail (Resend)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RESEND_API_KEY", "clave-de-prueba");
    vi.stubEnv("EMAIL_REMITENTE", "Don Segundo <avisos@ejemplo.com>");
    fetchMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("envía a la API de Resend con remitente, destinatario y ambas versiones", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(enviarEmail({ ...mensaje, claveIdempotencia: "clave-1" })).resolves.toBe(true);

    const [url, opciones] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(opciones.method).toBe("POST");
    const encabezados = opciones.headers as Record<string, string>;
    expect(encabezados.Authorization).toBe("Bearer clave-de-prueba");
    expect(encabezados["Idempotency-Key"]).toBe("clave-1");
    expect(JSON.parse(opciones.body as string)).toEqual({
      from: "Don Segundo <avisos@ejemplo.com>",
      to: ["ana@ejemplo.com"],
      subject: "Asunto de prueba",
      html: "<p>Hola</p>",
      text: "Hola",
    });
  });

  it("sin configuración no llama al proveedor y devuelve false", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    expect(emailConfigurado()).toBe(false);
    await expect(enviarEmail(mensaje)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve false (sin lanzar) si Resend rechaza el envío", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 422 }));

    await expect(enviarEmail(mensaje)).resolves.toBe(false);
  });

  it("devuelve false (sin lanzar) ante un error de red, sin loguear la clave", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(enviarEmail(mensaje)).resolves.toBe(false);
    const registrado = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(registrado).not.toContain("clave-de-prueba");
  });
});
