import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enviarEmail: vi.fn(),
  waitUntil: vi.fn(),
}));

vi.mock("@/lib/email/enviar", () => ({ enviarEmail: mocks.enviarEmail }));
vi.mock("@vercel/functions", () => ({ waitUntil: mocks.waitUntil }));

import { enviarEmailRestablecer, enviarEmailVerificacion } from "./emails-auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enviarEmail.mockResolvedValue(true);
});

describe("mails de Better Auth", () => {
  it("manda la confirmación de email con el enlace de Better Auth, sin bloquear la respuesta (RF-01)", async () => {
    await enviarEmailVerificacion({
      user: { email: "ana@ejemplo.com", name: "Ana" },
      url: "https://ejemplo.com/verificar?token=t",
    });

    expect(mocks.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        para: "ana@ejemplo.com",
        asunto: "Confirmá tu email en Don Segundo",
        texto: expect.stringContaining("https://ejemplo.com/verificar?token=t"),
      })
    );
    expect(mocks.waitUntil).toHaveBeenCalledTimes(1);
  });

  it("manda el mail de recuperación de contraseña (RF-03)", async () => {
    await enviarEmailRestablecer({
      user: { email: "ana@ejemplo.com", name: null },
      url: "https://ejemplo.com/reset/t",
    });

    expect(mocks.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        para: "ana@ejemplo.com",
        asunto: "Restablecé tu contraseña de Don Segundo",
      })
    );
    expect(mocks.waitUntil).toHaveBeenCalledTimes(1);
  });
});
