import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  eliminarResenia,
  ReseniaDeOtroUsuarioError,
  ReseniaNoEncontradaError,
} from "@/lib/ratings";

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
 * DELETE /api/ratings/[id] — elimina una reseña (RF-31). Requiere sesión y
 * solo el autor (comprador) puede borrar su propia reseña. El recálculo de
 * los agregados del vendedor ocurre dentro de la misma transacción en el
 * service. Éxito: 200 { data: { eliminado: true } }.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  try {
    const resultado = await eliminarResenia({
      ratingId: id,
      compradorId: session.user.id,
    });
    return NextResponse.json({ data: resultado });
  } catch (error) {
    if (error instanceof ReseniaNoEncontradaError) {
      return respuestaError(404, "RESENIA_NO_ENCONTRADA", error.message);
    }
    if (error instanceof ReseniaDeOtroUsuarioError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    console.error("Error al eliminar la reseña:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudo eliminar la reseña. Intenta de nuevo."
    );
  }
}