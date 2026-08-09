import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { contarNoLeidas } from "@/lib/notificaciones";

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
 * GET /api/notificaciones/no-leidas — cantidad de notificaciones sin leer del
 * usuario autenticado, para el badge de la navegación.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  const cantidad = await contarNoLeidas(session.user.id);
  return NextResponse.json({ data: { cantidad } });
}