import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VendedorPage from "./page";

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  queryRaw: vi.fn(),
  findManyListings: vi.fn(),
  getSession: vi.fn(),
  notFound: vi.fn(),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUser },
    listing: { findMany: mocks.findManyListings },
    $queryRaw: mocks.queryRaw,
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  usePathname: mocks.usePathname,
  useRouter: mocks.useRouter,
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

const usuario = {
  id: "vendedor-1",
  name: "Juan Pérez",
  image: null,
  locationLabel: "Santa Fe",
  createdAt: new Date("2025-01-10T00:00:00Z"),
};

const publicacionActiva = {
  id: "lista-1",
  title: "Tractor John Deere",
  price: { toString: () => "1500000" },
  currency: "ARS",
  condition: "USED",
  province: "Santa Fe",
  images: [{ url: "https://img.example/tractor.jpg", alt: "Tractor" }],
};

/** Tarjetas de la sección "Publicaciones de <vendedor>". */
function tarjetasPublicaciones() {
  const encabezado = screen.getByRole("heading", { level: 2, name: /^Publicaciones de/ });
  const seccion = encabezado.closest("section");
  if (!seccion) throw new Error("No se encontró la sección de publicaciones");
  return within(seccion).getAllByRole("listitem");
}

/** Indicador de confianza del encabezado (Calificación, Respuesta, En venta). */
function indicador(titulo: string) {
  const etiqueta = screen.getByText(titulo);
  const caja = etiqueta.parentElement;
  if (!caja) throw new Error(`No se encontró el indicador ${titulo}`);
  return within(caja);
}

async function renderizarPagina(id = "vendedor-1") {
  const pagina = await VendedorPage({ params: Promise.resolve({ id }) });
  return render(pagina);
}

describe("Página pública /vendedores/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.usePathname.mockReturnValue("/vendedores/vendedor-1");
    mocks.useRouter.mockReturnValue({ push: vi.fn(), refresh: vi.fn() });
    mocks.getSession.mockResolvedValue(null);
  });

  it("responde 404 cuando el vendedor no existe (REQ-1)", async () => {
    mocks.findUser.mockResolvedValue(null);

    await expect(renderizarPagina("inexistente")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("muestra nombre, antigüedad, bio, businessName, métrica y publicaciones (REQ-2/REQ-5)", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuario,
      profile: {
        bio: "Vendo maquinaria agrícola",
        businessName: "Agro Juan",
        ratingAvg: 0,
        ratingCount: 0,
      },
    });
    mocks.queryRaw.mockResolvedValue([{ muestras: 6, promedioHoras: 9.5 }]);
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    expect(
      screen.getByRole("heading", { level: 1, name: "Juan Pérez" })
    ).toBeInTheDocument();
    expect(screen.getByText("Agro Juan")).toBeInTheDocument();
    expect(screen.getByText(/En Don Segundo desde/)).toHaveTextContent(
      "enero de 2025"
    );
    expect(screen.getByText("Vendo maquinaria agrícola")).toBeInTheDocument();
    expect(indicador("Respuesta").getByText("~10 h")).toBeInTheDocument();
    expect(indicador("En venta").getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Tractor John Deere")).toBeInTheDocument();
  });

  it("sin Profile oculta bio, businessName y métrica, y no consulta la métrica (REQ-3)", async () => {
    mocks.findUser.mockResolvedValue({ ...usuario, profile: null });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    expect(
      screen.getByRole("heading", { level: 1, name: "Juan Pérez" })
    ).toBeInTheDocument();
    expect(screen.getByText(/En Don Segundo desde/)).toBeInTheDocument();
    expect(screen.getByText("Tractor John Deere")).toBeInTheDocument();
    expect(screen.queryByText("Agro Juan")).not.toBeInTheDocument();
    expect(screen.queryByText("Vendo maquinaria agrícola")).not.toBeInTheDocument();
    expect(indicador("Respuesta").getByText("Sin datos aún")).toBeInTheDocument();
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("oculta la métrica cuando hay menos de 3 conversaciones con respuesta (REQ-5)", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuario,
      profile: {
        bio: "Vendo maquinaria",
        businessName: "Agro Juan",
        ratingAvg: 0,
        ratingCount: 0,
      },
    });
    mocks.queryRaw.mockResolvedValue([{ muestras: 2, promedioHoras: 8 }]);
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    const respuesta = indicador("Respuesta");
    expect(respuesta.getByText("Sin datos aún")).toBeInTheDocument();
    expect(respuesta.queryByText(/~\d+ h/)).not.toBeInTheDocument();
  });

  it("solo consulta publicaciones ACTIVE con stock > 0 y renderiza las recibidas (REQ-4)", async () => {
    mocks.findUser.mockResolvedValue({ ...usuario, profile: null });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    // El where viaja por el helper real: la página filtra por estado y stock
    // en la consulta, sin excepción por rol (REQ-4/BR-5).
    expect(mocks.findManyListings).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ownerId: "vendedor-1",
          status: "ACTIVE",
          stock: { gt: 0 },
          deletedAt: null,
        },
      })
    );
    // Solo se renderiza lo que el helper devolvió como activo.
    expect(screen.getByText("Tractor John Deere")).toBeInTheDocument();
  });

  it("muestra estado vacío y no ofrece contacto cuando no hay publicaciones activas", async () => {
    mocks.findUser.mockResolvedValue({ ...usuario, profile: null });
    mocks.findManyListings.mockResolvedValue([]);

    await renderizarPagina();

    expect(
      screen.getByText(/todavía no tiene publicaciones activas/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Preguntar al vendedor" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Preguntar al vendedor" })
    ).not.toBeInTheDocument();
  });

  it("ofrece Contactar al visitante anónimo con redirect a sign-in (REQ-6)", async () => {
    mocks.findUser.mockResolvedValue({ ...usuario, profile: null });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    const contacto = screen.getByRole("link", { name: "Preguntar al vendedor" });
    expect(contacto).toHaveAttribute(
      "href",
      expect.stringContaining("/sign-in?redirect=")
    );
  });

  it("no ofrece Contactar al propio vendedor (REQ-6/REQ-4 dueño)", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "vendedor-1" } });
    mocks.findUser.mockResolvedValue({ ...usuario, profile: null });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    expect(
      screen.queryByRole("link", { name: "Preguntar al vendedor" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Preguntar al vendedor" })
    ).not.toBeInTheDocument();
  });

  it("muestra el rating en el header y en la tarjeta con 3+ muestras (RF-24/RF-52)", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuario,
      profile: {
        bio: "Vendo maquinaria",
        businessName: "Agro Juan",
        ratingAvg: 4.5,
        ratingCount: 12,
      },
    });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    // Header: bloque de rating del perfil (RF-24) + tarjeta: estrellas sm
    // (RF-52). Ambas comparten el aria-label "X de 5 (n reseñas)".
    expect(
      screen.getAllByRole("img", { name: "4,5 de 5 (12 reseñas)" })
    ).toHaveLength(2);
    expect(
      indicador("Calificación").getByRole("img", { name: "4,5 de 5 (12 reseñas)" })
    ).toBeInTheDocument();
    const tarjetas = tarjetasPublicaciones();
    expect(
      within(tarjetas[0]).getByRole("img", { name: "4,5 de 5 (12 reseñas)" })
    ).toBeInTheDocument();
  });

  it("oculta el puntaje con menos de 3 muestras y muestra 'Sin reseñas aún' (RF-24/RF-52)", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuario,
      profile: {
        bio: "Vendo maquinaria",
        businessName: "Agro Juan",
        ratingAvg: 5,
        ratingCount: 2,
      },
    });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    expect(screen.queryByRole("img", { name: /de 5/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ de 5/)).not.toBeInTheDocument();
    // RF-24: el indicador del encabezado y RF-52: la tarjeta muestran el
    // estado vacío, nunca un puntaje.
    expect(indicador("Calificación").getByText("Sin reseñas aún")).toBeInTheDocument();
    const tarjetas = tarjetasPublicaciones();
    expect(within(tarjetas[0]).getByText("Sin reseñas aún")).toBeInTheDocument();
  });

  it("muestra el sello Verificado en el header y en la tarjeta cuando el vendedor está VERIFIED (RF-34/RF-38)", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuario,
      profile: {
        bio: null,
        businessName: null,
        sellerVerified: "VERIFIED",
        ratingAvg: 0,
        ratingCount: 0,
      },
    });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    // Un sello junto al nombre del perfil (RF-34) y otro en la tarjeta de la
    // publicación (RF-38): la tarjeta recibe sellerVerified del perfil.
    const sellos = screen.getAllByText("Verificado");
    expect(sellos).toHaveLength(2);
    expect(
      within(screen.getByRole("heading", { level: 1 }).parentElement!).getByText("Verificado")
    ).toBeInTheDocument();
    const tarjetas = tarjetasPublicaciones();
    expect(tarjetas).toHaveLength(1);
    expect(within(tarjetas[0]).getByText("Verificado")).toBeInTheDocument();
  });

  it("no muestra el sello cuando la verificación no es VERIFIED (RF-34)", async () => {
    mocks.findUser.mockResolvedValue({
      ...usuario,
      profile: {
        bio: null,
        businessName: null,
        sellerVerified: "NONE",
        ratingAvg: 0,
        ratingCount: 0,
      },
    });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    expect(screen.queryByText("Verificado")).not.toBeInTheDocument();
  });

  it("no muestra el sello sin Profile (RF-34)", async () => {
    mocks.findUser.mockResolvedValue({ ...usuario, profile: null });
    mocks.findManyListings.mockResolvedValue([publicacionActiva]);

    await renderizarPagina();

    expect(screen.queryByText("Verificado")).not.toBeInTheDocument();
  });
});
