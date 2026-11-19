import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: mocks.requestPasswordReset,
    resetPassword: mocks.resetPassword,
  },
}));

import { FormularioRecuperarContrasenia } from "./formulario-recuperar-contrasenia";
import { FormularioRestablecerContrasenia } from "./formulario-restablecer-contrasenia";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Recuperar contraseña (RF-03)", () => {
  it("pide el enlace con el destino correcto y confirma sin revelar si la cuenta existe", async () => {
    mocks.requestPasswordReset.mockResolvedValue({ error: null });
    const usuario = userEvent.setup();
    render(<FormularioRecuperarContrasenia />);

    await usuario.type(screen.getByLabelText("Email de tu cuenta"), "ana@ejemplo.com");
    await usuario.click(screen.getByRole("button", { name: "Enviarme el enlace" }));

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith({
      email: "ana@ejemplo.com",
      redirectTo: "/restablecer-contrasenia",
    });
    expect(await screen.findByText("Revisá tu correo")).toBeInTheDocument();
    expect(screen.getByText(/Si ana@ejemplo.com tiene una cuenta/)).toBeInTheDocument();
  });

  it("valida el email antes de enviar", async () => {
    const usuario = userEvent.setup();
    render(<FormularioRecuperarContrasenia />);

    await usuario.type(screen.getByLabelText("Email de tu cuenta"), "no-es-email");
    await usuario.click(screen.getByRole("button", { name: "Enviarme el enlace" }));

    expect(screen.getByText("Ingresá un email válido")).toBeInTheDocument();
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("Restablecer contraseña (RF-03)", () => {
  it("guarda la contraseña nueva con el token del mail", async () => {
    mocks.resetPassword.mockResolvedValue({ error: null });
    const usuario = userEvent.setup();
    render(<FormularioRestablecerContrasenia token="token-1" />);

    await usuario.type(screen.getByLabelText("Contraseña nueva"), "clave-nueva-123");
    await usuario.type(screen.getByLabelText("Repetí la contraseña nueva"), "clave-nueva-123");
    await usuario.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(mocks.resetPassword).toHaveBeenCalledWith({
      newPassword: "clave-nueva-123",
      token: "token-1",
    });
    expect(await screen.findByText("Listo, cambiaste tu contraseña")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ingresar" })).toHaveAttribute("href", "/sign-in");
  });

  it("no envía si las contraseñas no coinciden", async () => {
    const usuario = userEvent.setup();
    render(<FormularioRestablecerContrasenia token="token-1" />);

    await usuario.type(screen.getByLabelText("Contraseña nueva"), "clave-nueva-123");
    await usuario.type(screen.getByLabelText("Repetí la contraseña nueva"), "otra-clave-123");
    await usuario.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

  it("explica el token vencido en español", async () => {
    mocks.resetPassword.mockResolvedValue({ error: { code: "INVALID_TOKEN", message: "invalid token" } });
    const usuario = userEvent.setup();
    render(<FormularioRestablecerContrasenia token="token-viejo" />);

    await usuario.type(screen.getByLabelText("Contraseña nueva"), "clave-nueva-123");
    await usuario.type(screen.getByLabelText("Repetí la contraseña nueva"), "clave-nueva-123");
    await usuario.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText(/El enlace venció o ya se usó/)).toBeInTheDocument();
  });
});
