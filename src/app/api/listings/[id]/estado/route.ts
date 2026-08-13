import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  AccionEstadoInvalidaError,
  pausarPublicacionPropia,
  PublicacionNoEncontradaError,
  PublicacionNoPerteneceError,
  reanudarPublicacionPropia,
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

const accionEstadoPublicacionSchema = z.object({
  accion: z.enum(["pausar", "reanudar"], {
    message: "La acción solicitada no es válida",
  }),
});

/**
 * POST /api/listings/[id]/estado — pausa o reanuda una publicación propia
 * (solo su dueño). "pausar" solo desde ACTIVE; "reanudar" solo desde PAUSED.
 * 404 si no existe, 403 si no es dueño, 400 si la transición de estado no es
 * válida. Notifica al dueño y a los favoritos del cambio (best-effort).
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

  const parseado = accionEstadoPublicacionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "La acción solicitada no es válida"
    );
  }

  try {
    const data =
      parseado.data.accion === "pausar"
        ? await pausarPublicacionPropia(session.user.id, id)
        : await reanudarPublicacionPropia(session.user.id, id);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof PublicacionNoEncontradaError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    if (error instanceof PublicacionNoPerteneceError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    if (error instanceof AccionEstadoInvalidaError) {
      return respuestaError(400, "ESTADO_INVALIDO", error.message);
    }
    console.error("Error al cambiar el estado de la publicación:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo completar la acción. Intenta de nuevo.");
  }
}