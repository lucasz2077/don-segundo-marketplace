import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { crearConversacionSchema } from "@/lib/validation/mensaje";
import {
  AutoContactoError,
  crearConversacionOMensaje,
  obtenerConversacionesDeUsuario,
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
 * GET /api/conversaciones — lista las conversaciones del usuario autenticado.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  const conversaciones = await obtenerConversacionesDeUsuario(session.user.id);
  return NextResponse.json({ data: conversaciones });
}

/**
 * POST /api/conversaciones — inicia una conversación (o continúa una
 * existente) con un primer mensaje hacia el vendedor de la publicación.
 */
export async function POST(request: NextRequest) {
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

  const parseado = crearConversacionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "Los datos de la consulta no son válidos"
    );
  }

  try {
    const { listingId, mensaje } = parseado.data;
    const resultado = await crearConversacionOMensaje(
      session.user.id,
      listingId,
      mensaje
    );
    return NextResponse.json({ data: resultado }, { status: 201 });
  } catch (error) {
    if (error instanceof PublicacionNoDisponibleError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    if (error instanceof AutoContactoError) {
      return respuestaError(400, "VALIDACION", error.message);
    }
    console.error("Error al iniciar conversación:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo enviar tu consulta. Intenta de nuevo.");
  }
}