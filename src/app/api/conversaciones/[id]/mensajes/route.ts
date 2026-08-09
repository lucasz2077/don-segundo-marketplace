import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { enviarMensajeSchema } from "@/lib/validation/mensaje";
import {
  enviarMensaje,
  NoParticipanteError,
  PublicacionNoDisponibleError,
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
 * POST /api/conversaciones/[id]/mensajes — envía un mensaje en una
 * conversación existente. El usuario debe participar de la conversación y la
 * publicación debe seguir activa.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError(400, "CUERPO_INVALIDO", "El cuerpo de la petición no es JSON válido");
  }

  const parseado = enviarMensajeSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "El mensaje no es válido"
    );
  }

  try {
    const mensaje = await enviarMensaje(id, session.user.id, parseado.data.mensaje);
    return NextResponse.json({ data: mensaje }, { status: 201 });
  } catch (error) {
    if (error instanceof NoParticipanteError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    if (error instanceof PublicacionNoDisponibleError) {
      return respuestaError(400, "NO_ENCONTRADA", error.message);
    }
    console.error("Error al enviar mensaje:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo enviar el mensaje. Intenta de nuevo.");
  }
}