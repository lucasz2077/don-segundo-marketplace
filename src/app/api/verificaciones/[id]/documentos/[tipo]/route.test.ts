import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  obtenerDocumentoVerificacion: vi.fn(),
  descargarDocumentoPrivado: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));

vi.mock("@/lib/cloudinary", () => ({
  descargarDocumentoPrivado: mocks.descargarDocumentoPrivado,
}));

// Se preservan las clases de error reales del service (el handler usa
// `instanceof`): solo se reemplaza la consulta del documento.
vi.mock("@/lib/verificaciones", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/verificaciones")>();
  return { ...actual, obtenerDocumentoVerificacion: mocks.obtenerDocumentoVerificacion };
});

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { GET } from "@/app/api/verificaciones/[id]/documentos/[tipo]/route";

const peticion = () =>
  new Request("http://localhost/api/verificaciones/sol-1/documentos/dni") as NextRequest;
const params = (tipo = "dni") => ({ params: Promise.resolve({ id: "sol-1", tipo }) });

const sesionAdmin = { user: { id: "admin-1", role: "ADMIN" } };

describe("GET /api/verificaciones/[id]/documentos/[tipo] (RNF-15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(sesionAdmin);
  });

  it("responde 401 sin sesión y 403 a quien no es admin, sin buscar el documento", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    expect((await GET(peticion(), params())).status).toBe(401);

    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1", role: "USER" } });
    expect((await GET(peticion(), params())).status).toBe(403);

    expect(mocks.obtenerDocumentoVerificacion).not.toHaveBeenCalled();
  });

  it("responde 404 ante un tipo de documento desconocido", async () => {
    const respuesta = await GET(peticion(), params("pasaporte"));
    expect(respuesta.status).toBe(404);
    expect(mocks.obtenerDocumentoVerificacion).not.toHaveBeenCalled();
  });

  it("entrega el documento privado como JPG sin caché ni URL de Cloudinary", async () => {
    mocks.obtenerDocumentoVerificacion.mockResolvedValue({
      tipo: "privado",
      publicId: "don-segundo-verificaciones/vendedor-1/dni",
    });
    mocks.descargarDocumentoPrivado.mockResolvedValue(new Response("bytes-del-dni"));

    const respuesta = await GET(peticion(), params());

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("image/jpeg");
    expect(respuesta.headers.get("cache-control")).toBe("private, no-store");
    expect(respuesta.headers.get("location")).toBeNull();
    expect(await respuesta.text()).toBe("bytes-del-dni");
    expect(mocks.descargarDocumentoPrivado).toHaveBeenCalledWith(
      "don-segundo-verificaciones/vendedor-1/dni"
    );
  });

  it("redirige a la URL legada solo si es https", async () => {
    const legada = "https://res.cloudinary.com/c/image/upload/v1/don-segundo/dni.jpg";
    mocks.obtenerDocumentoVerificacion.mockResolvedValueOnce({ tipo: "legado", url: legada });
    const redireccion = await GET(peticion(), params());
    expect(redireccion.status).toBe(302);
    expect(redireccion.headers.get("location")).toBe(legada);

    mocks.obtenerDocumentoVerificacion.mockResolvedValueOnce({
      tipo: "legado",
      url: "javascript:alert(1)",
    });
    expect((await GET(peticion(), params())).status).toBe(404);
  });

  it("responde 404 si la solicitud no tiene ese documento", async () => {
    mocks.obtenerDocumentoVerificacion.mockResolvedValue(null);
    expect((await GET(peticion(), params())).status).toBe(404);
  });
});
