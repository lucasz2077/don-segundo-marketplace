import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  marcarConversacionLeida,
  obtenerConversacionDetalle,
} from "@/lib/conversaciones";

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
 * GET /api/conversaciones/[id] — detalle de una conversación con todos sus
 * mensajes. 404 si no existe o el usuario no participa.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  const conversacion = await obtenerConversacionDetalle(id, session.user.id);
  if (!conversacion) {
    return respuestaError(404, "NO_ENCONTRADA", "La conversación no existe");
  }

  return NextResponse.json({ data: conversacion });
}

/**
 * PATCH /api/conversaciones/[id] — marca como leídos los mensajes de la otra
 * parte. 404 si el usuario no participa de la conversación.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  const marcada = await marcarConversacionLeida(id, session.user.id);
  if (!marcada) {
    return respuestaError(404, "NO_ENCONTRADA", "La conversación no existe");
  }

  return NextResponse.json({ data: { id, leida: true } });
}