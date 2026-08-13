import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MensajesPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerConversacionesDeUsuario: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/conversaciones", () => ({
  obtenerConversacionesDeUsuario: mocks.obtenerConversacionesDeUsuario,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

const conversaciones = [
  {
    id: "conv-1",
    listingId: "lista-1",
    listingTitulo: "Tractor John Deere",
    listingImagen: null,
    otroParticipante: { id: "vendedor-1", name: "Juan Pérez", image: null },
    ultimoMensaje: {
      senderId: "vendedor-1",
      body: "Hola, sigue disponible",
      readAt: null,
      createdAt: new Date("2026-08-01T10:00:00Z"),
    },
    noLeidos: 1,
    lastMessageAt: new Date("2026-08-01T10:00:00Z"),
    createdAt: new Date("2026-07-30T10:00:00Z"),
    rol: "comprador" as const,
  },
  {
    id: "conv-2",
    listingId: "lista-2",
    listingTitulo: "Sembradora de precisión",
    listingImagen: null,
    otroParticipante: { id: "comprador-2", name: "María López", image: null },
    ultimoMensaje: null,
    noLeidos: 0,
    lastMessageAt: null,
    createdAt: new Date("2026-07-28T10:00:00Z"),
    rol: "vendedor" as const,
  },
];

async function renderizarPagina() {
  const pagina = await MensajesPage();
  return render(pagina);
}

describe("Bandeja de mensajes /mensajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.getSession.mockResolvedValue({ user: { id: "usuario-1" } });
  });

  it("enlaza el nombre del otro participante a su perfil público (follow-up REQ-8)", async () => {
    mocks.obtenerConversacionesDeUsuario.mockResolvedValue(conversaciones);

    await renderizarPagina();

    expect(
      screen.getByRole("link", { name: "Juan Pérez" })
    ).toHaveAttribute("href", "/vendedores/vendedor-1");
    expect(
      screen.getByRole("link", { name: "María López" })
    ).toHaveAttribute("href", "/vendedores/comprador-2");
    expect(
      screen.getByRole("link", { name: /Tractor John Deere/ })
    ).toHaveAttribute("href", "/mensajes/conv-1");
  });

  it("agrupa las conversaciones por rol con su conteo", async () => {
    mocks.obtenerConversacionesDeUsuario.mockResolvedValue(conversaciones);

    await renderizarPagina();

    expect(
      screen.getByRole("heading", { name: "Comprando (1)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Vendiendo (1)" })
    ).toBeInTheDocument();
  });

  it("redirige a sign-in cuando no hay sesión", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(renderizarPagina()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in?redirect=/mensajes");
  });

  it("muestra el estado vacío cuando no hay conversaciones", async () => {
    mocks.obtenerConversacionesDeUsuario.mockResolvedValue([]);

    await renderizarPagina();

    expect(
      screen.getByText("Todavía no hay conversaciones")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explorar publicaciones" })
    ).toHaveAttribute("href", "/listados");
  });
});
