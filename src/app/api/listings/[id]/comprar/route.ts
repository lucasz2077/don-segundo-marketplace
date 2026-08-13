import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  comprarPublicacion,
  CompraPublicacionPropiaError,
  PublicacionNoActivaError,
  PublicacionNoEncontradaError,
  SinStockError,
} from "@/lib/compras";

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

/**
 * POST /api/listings/[id]/comprar — compra directa de una publicación.
 * Requiere sesión. Decrementa el stock de forma atómica y, si llega a 0,
 * pasa la publicación a SOLD. Respuestas de negocio tipadas: 404 si no
 * existe, 403 si el comprador es el dueño, 400 si no está activa y 409 si no
 * hay stock.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  try {
    const data = await comprarPublicacion({
      compradorId: session.user.id,
      listingId: id,
    });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof PublicacionNoEncontradaError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    if (error instanceof CompraPublicacionPropiaError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    if (error instanceof SinStockError) {
      return respuestaError(409, "SIN_STOCK", error.message);
    }
    if (error instanceof PublicacionNoActivaError) {
      return respuestaError(400, "NO_ACTIVA", error.message);
    }
    console.error("Error al comprar publicación:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo concretar la compra. Intenta de nuevo.");
  }
}