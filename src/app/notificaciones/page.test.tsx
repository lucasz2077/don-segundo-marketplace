import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerNotificaciones: vi.fn(),
  marcarNotificacionesLeidas: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

// parsearPayload es la real: el test cubre el destino según el payload.
vi.mock("@/lib/notificaciones", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/notificaciones")>();
  return {
    ...real,
    obtenerNotificaciones: mocks.obtenerNotificaciones,
    marcarNotificacionesLeidas: mocks.marcarNotificacionesLeidas,
  };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/notificaciones",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

import NotificacionesPage from "./page";

const notificacion = (payload: Record<string, unknown>) => ({
  id: "n1",
  userId: "u1",
  listingId: "l1",
  listing: { id: "l1", title: "Recado" },
  title: "Solicitud de devolución",
  body: 'LukiLuki solicitó una devolución de "Recado".',
  tipo: "GENERAL",
  payload,
  readAt: null,
  createdAt: new Date("2026-11-19T03:07:00Z"),
});

async function renderizarCon(payload: Record<string, unknown>) {
  mocks.obtenerNotificaciones.mockResolvedValue({
    notificaciones: [notificacion(payload)],
    total: 1,
    pagina: 1,
    totalPaginas: 1,
  });
  const pagina = await NotificacionesPage({ searchParams: Promise.resolve({}) });
  return render(pagina);
}

describe("Página /notificaciones — destino de las notificaciones de devolución (RF-49)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: "u1", name: "Vendedor" } });
  });

  it("una solicitud PENDIENTE lleva al vendedor a resolverla, no a la publicación", async () => {
    await renderizarCon({ evento: "devolucion", solicitudId: "s1", estado: "PENDIENTE" });

    const enlace = screen.getByRole("link", { name: "Revisar solicitud" });
    expect(enlace).toHaveAttribute("href", "/perfil/devoluciones");
    expect(screen.queryByRole("link", { name: "Ver publicación" })).toBeNull();
  });

  it("una devolución resuelta lleva al comprador a sus compras", async () => {
    await renderizarCon({ evento: "devolucion", solicitudId: "s1", estado: "APROBADA" });

    expect(screen.getByRole("link", { name: "Ver mis compras" })).toHaveAttribute(
      "href",
      "/compras"
    );
  });

  it("una notificación GENERAL sin evento propio mantiene el enlace a la publicación", async () => {
    await renderizarCon({ evento: "pago_aprobado", compraId: "c1", listingId: "l1", titulo: "Recado", monto: "10000.00" });

    expect(screen.getByRole("link", { name: "Ver publicación" })).toHaveAttribute(
      "href",
      "/listados/l1"
    );
  });
});
