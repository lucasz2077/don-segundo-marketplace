import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  agregarFavorito,
  PublicacionNoDisponibleError,
  quitarFavorito,
} from "@/lib/favoritos";

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
 * POST /api/favoritos/[listingId] — marca la publicación como favorita del
 * usuario. Es idempotente: si ya está marcada, se responde OK.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  try {
    const favorito = await agregarFavorito(session.user.id, listingId);
    return NextResponse.json({ data: favorito });
  } catch (error) {
    if (error instanceof PublicacionNoDisponibleError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    console.error("Error al agregar favorito:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo guardar el favorito. Intenta de nuevo.");
  }
}

/**
 * DELETE /api/favoritos/[listingId] — quita el favorito del usuario.
 * Idempotente: si no existía, se responde OK.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  await quitarFavorito(session.user.id, listingId);
  return NextResponse.json({ data: { eliminado: true } });
}