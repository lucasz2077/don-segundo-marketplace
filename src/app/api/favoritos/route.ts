import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { obtenerFavoritos } from "@/lib/favoritos";

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
 * GET /api/favoritos — lista los favoritos del usuario autenticado.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  const favoritos = await obtenerFavoritos(session.user.id);
  return NextResponse.json({ data: favoritos });
}