import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { obtenerNotificaciones } from "@/lib/notificaciones";

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
 * GET /api/notificaciones?pagina=1 — lista paginada de notificaciones del
 * usuario autenticado, ordenadas de la más reciente a la más antigua.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  const pagina = Math.max(1, Number(request.nextUrl.searchParams.get("pagina")) || 1);
  const data = await obtenerNotificaciones(session.user.id, pagina);

  return NextResponse.json({ data });
}