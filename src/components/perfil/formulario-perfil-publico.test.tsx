import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioPerfilPublico } from "./formulario-perfil-publico";

const mocks = vi.hoisted(() => ({
  useRouter: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: mocks.useRouter,
}));

function respuestaOk(cuerpo: unknown) {
  return {
    ok: true,
    json: async () => cuerpo,
  } as Response;
}

function respuestaError(mensaje: string) {
  return {
    ok: false,
    json: async () => ({ error: { code: "VALIDACION", message: mensaje } }),
  } as Response;
}

describe("FormularioPerfilPublico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ refresh: vi.fn(), push: vi.fn() });
    vi.spyOn(globalThis, "fetch").mockImplementation(mocks.fetch);
    mocks.fetch.mockResolvedValue(
      respuestaOk({ data: { id: "perfil-1", bio: "x", businessName: "y" } })
    );
  });

  it("precarga los valores actuales del perfil en los campos (REQ-9 prefill)", () => {
    render(
      <FormularioPerfilPublico
        bio="Vendo maquinaria agrícola"
        businessName="Agro Juan"
      />
    );

    expect(screen.getByLabelText(/^Bio/)).toHaveValue(
      "Vendo maquinaria agrícola"
    );
    expect(screen.getByLabelText(/Nombre comercial/)).toHaveValue("Agro Juan");
  });

  it("precarga campos vacíos cuando el Profile aún no existe (lazy upsert)", () => {
    render(<FormularioPerfilPublico bio={null} businessName={null} />);

    expect(screen.getByLabelText(/^Bio/)).toHaveValue("");
    expect(screen.getByLabelText(/Nombre comercial/)).toHaveValue("");
  });

  it("envía PATCH /api/perfil con bio y businessName y muestra el éxito", async () => {
    render(
      <FormularioPerfilPublico
        bio="Vendo maquinaria"
        businessName="Agro Juan"
      />
    );

    fireEvent.change(screen.getByLabelText(/^Bio/), {
      target: { value: "Vendo sembradoras y tractores" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar perfil" })
    );

    expect(await screen.findByText(/guardado correctamente/i)).toBeInTheDocument();

    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/perfil",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })
    );
    const [url, opciones] = mocks.fetch.mock.calls[0];
    expect(url).toBe("/api/perfil");
    expect(JSON.parse(opciones.body as string)).toEqual({
      bio: "Vendo sembradoras y tractores",
      businessName: "Agro Juan",
    });
    expect(mocks.useRouter().refresh).toHaveBeenCalled();
  });

  it("envía null cuando un campo queda vacío", async () => {
    render(<FormularioPerfilPublico bio="Vendo maquinaria" businessName="Agro Juan" />);

    fireEvent.change(screen.getByLabelText(/Nombre comercial/), {
      target: { value: "  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));

    await screen.findByText(/guardado correctamente/i);

    const [, opciones] = mocks.fetch.mock.calls[0];
    expect(JSON.parse(opciones.body as string)).toEqual({
      bio: "Vendo maquinaria",
      businessName: null,
    });
  });

  it("muestra el error del servidor y no refresca cuando la API falla", async () => {
    mocks.fetch.mockResolvedValue(
      respuestaError("La bio es demasiado larga")
    );
    render(<FormularioPerfilPublico bio={null} businessName={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));

    expect(await screen.findByText("La bio es demasiado larga")).toBeInTheDocument();
    expect(screen.queryByText(/guardado correctamente/i)).not.toBeInTheDocument();
    expect(mocks.useRouter().refresh).not.toHaveBeenCalled();
  });

  it("deshabilita el botón y muestra el estado de carga mientras envía", async () => {
    let resolver!: (valor: unknown) => void;
    mocks.fetch.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }) as unknown as Promise<Response>
    );
    render(<FormularioPerfilPublico bio={null} businessName={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));

    expect(screen.getByText("Guardando...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardando..." })
    ).toBeDisabled();

    resolver(respuestaOk({ data: { id: "perfil-1", bio: null, businessName: null } }));
    expect(await screen.findByText(/guardado correctamente/i)).toBeInTheDocument();
  });
});
