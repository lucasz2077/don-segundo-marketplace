import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { contarNoLeidos } from "@/lib/conversaciones";

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
 * GET /api/conversaciones/no-leidas — cantidad de mensajes sin leer del
 * usuario autenticado, para el badge de la navegación.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  const cantidad = await contarNoLeidos(session.user.id);
  return NextResponse.json({ data: { cantidad } });
}