import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  busquedaSchema,
  crearPublicacionSchema,
} from "@/lib/validation/listing";
import {
  CategoriaInvalidaError,
  crearPublicacion,
  obtenerPublicacionesActivas,
} from "@/lib/listings";

export const dynamic = "force-dynamic";

type ErrorRespuesta = {
  error: { code: string; message: string };
};

function respuestaError(
  status: number,
  code: string,
  message: string
): NextResponse<ErrorRespuesta> {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Filtra los searchParams vacíos para que Zod no reciba strings en blanco. */
function leerFiltro(params: URLSearchParams, clave: string): string | undefined {
  const valor = params.get(clave);
  return valor && valor.trim() ? valor.trim() : undefined;
}

/**
 * GET /api/listings — listado con filtros y paginación.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parseado = busquedaSchema.safeParse({
    q: leerFiltro(params, "q"),
    categoria: leerFiltro(params, "categoria"),
    provincia: leerFiltro(params, "provincia"),
    minPrecio: leerFiltro(params, "minPrecio"),
    maxPrecio: leerFiltro(params, "maxPrecio"),
    orden: leerFiltro(params, "orden"),
    pagina: leerFiltro(params, "pagina"),
  });

  if (!parseado.success) {
    return respuestaError(
      400,
      "FILTROS_INVALIDOS",
      parseado.error.issues[0]?.message ?? "Los filtros de búsqueda no son válidos"
    );
  }

  const resultado = await obtenerPublicacionesActivas({
    busqueda: parseado.data.q,
    categoria: parseado.data.categoria,
    provincia: parseado.data.provincia,
    minPrecio: parseado.data.minPrecio,
    maxPrecio: parseado.data.maxPrecio,
    orden: parseado.data.orden,
    pagina: parseado.data.pagina,
  });

  return NextResponse.json({ data: resultado });
}

/**
 * POST /api/listings — crea una publicación. Requiere sesión.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión para publicar");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError(400, "CUERPO_INVALIDO", "El cuerpo de la petición no es JSON válido");
  }

  const parseado = crearPublicacionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "Los datos de la publicación no son válidos"
    );
  }

  try {
    const publicacion = await crearPublicacion(session.user.id, parseado.data);
    return NextResponse.json({ data: publicacion }, { status: 201 });
  } catch (error) {
    if (error instanceof CategoriaInvalidaError) {
      return respuestaError(400, "CATEGORIA_INVALIDA", error.message);
    }
    console.error("Error al crear publicación:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo crear la publicación. Intenta de nuevo.");
  }
}
