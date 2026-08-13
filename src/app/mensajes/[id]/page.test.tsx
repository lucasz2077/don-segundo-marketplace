import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConversacionPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerConversacionDetalle: vi.fn(),
  marcarConversacionLeida: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/conversaciones", () => ({
  obtenerConversacionDetalle: mocks.obtenerConversacionDetalle,
  marcarConversacionLeida: mocks.marcarConversacionLeida,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

// El foco de esta prueba es el header (REQ-8); el chat con polling se aísla.
vi.mock("@/components/mensajes/chat-conversacion", () => ({
  ChatConversacion: () => <div data-testid="chat-conversacion" />,
}));

const conversacion = {
  id: "conv-1",
  buyerId: "comprador-1",
  sellerId: "vendedor-1",
  listing: {
    id: "lista-1",
    title: "Tractor John Deere",
    price: { toString: () => "1500000" },
    currency: "ARS",
    status: "ACTIVE",
    owner: { id: "vendedor-1", name: "Juan Pérez" },
    images: [],
  },
  otroParticipante: { id: "vendedor-1", name: "Juan Pérez", image: null },
  messages: [],
};

async function renderizarPagina(id = "conv-1") {
  const pagina = await ConversacionPage({ params: Promise.resolve({ id }) });
  return render(pagina);
}

describe("Chat /mensajes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.getSession.mockResolvedValue({ user: { id: "comprador-1" } });
    mocks.marcarConversacionLeida.mockResolvedValue(true);
  });

  it("enlaza el nombre del otro participante a su perfil público (REQ-8)", async () => {
    mocks.obtenerConversacionDetalle.mockResolvedValue(conversacion);

    await renderizarPagina();

    const enlace = screen.getByRole("link", { name: "Juan Pérez" });
    expect(enlace).toHaveAttribute("href", "/vendedores/vendedor-1");
    expect(mocks.marcarConversacionLeida).toHaveBeenCalledWith(
      "conv-1",
      "comprador-1"
    );
  });

  it("responde 404 cuando la conversación no existe", async () => {
    mocks.obtenerConversacionDetalle.mockResolvedValue(null);

    await expect(renderizarPagina("inexistente")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("redirige a sign-in cuando no hay sesión", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(renderizarPagina("conv-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in?redirect=/mensajes");
  });
});
