import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { actualizarDireccion, eliminarDireccion } from "@/lib/direcciones";
import { direccionSchema } from "@/lib/validation/direccion";

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
 * PATCH /api/direcciones/[id] — edita una dirección (solo su dueño).
 * 404 si la dirección no existe o no pertenece al usuario.
 */
export async function PATCH(
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

  const parseado = direccionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "Los datos de la dirección no son válidos"
    );
  }

  try {
    const direccion = await actualizarDireccion(id, session.user.id, parseado.data);
    if (!direccion) {
      return respuestaError(404, "NO_ENCONTRADA", "La dirección no existe");
    }
    return NextResponse.json({ data: direccion });
  } catch (error) {
    console.error("Error al actualizar dirección:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo guardar la dirección. Intenta de nuevo.");
  }
}

/**
 * DELETE /api/direcciones/[id] — elimina una dirección del usuario.
 * 404 si no existe o no le pertenece.
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
    const eliminada = await eliminarDireccion(id, session.user.id);
    if (!eliminada) {
      return respuestaError(404, "NO_ENCONTRADA", "La dirección no existe");
    }
    return NextResponse.json({ data: { eliminada: true } });
  } catch (error) {
    console.error("Error al eliminar dirección:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo eliminar la dirección. Intenta de nuevo.");
  }
}