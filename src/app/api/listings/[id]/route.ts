import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { crearPublicacionSchema } from "@/lib/validation/listing";
import {
  actualizarPublicacion,
  CategoriaInvalidaError,
  eliminarPublicacion,
  obtenerPublicacion,
  obtenerPublicacionPorId,
} from "@/lib/listings";

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
 * GET /api/listings/[id] — detalle público de una publicación. Cuenta la
 * vista salvo que la consulte su propietario (el propio usuario no infla el
 * contador). 404 si no existe o fue eliminada.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession().catch(() => null);
  const publicacion = await obtenerPublicacionPorId(id, session?.user.id);
  if (!publicacion) {
    return respuestaError(404, "NO_ENCONTRADA", "La publicación no existe");
  }
  return NextResponse.json({ data: publicacion });
}

/**
 * PATCH /api/listings/[id] — actualiza una publicación (solo su dueño).
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

  const publicacion = await obtenerPublicacion(id);
  if (!publicacion || publicacion.deletedAt) {
    return respuestaError(404, "NO_ENCONTRADA", "La publicación no existe");
  }
  if (publicacion.ownerId !== session.user.id) {
    return respuestaError(403, "SIN_PERMISO", "No tenés permiso para editar esta publicación");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError(400, "CUERPO_INVALIDO", "El cuerpo de la petición no es JSON válido");
  }

  const parseado = crearPublicacionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "Los datos de la publicación no son válidos"
    );
  }

  try {
    const actualizada = await actualizarPublicacion(id, session.user.id, parseado.data);
    if (!actualizada) {
      return respuestaError(404, "NO_ENCONTRADA", "La publicación no existe");
    }
    return NextResponse.json({ data: actualizada });
  } catch (error) {
    if (error instanceof CategoriaInvalidaError) {
      return respuestaError(400, "CATEGORIA_INVALIDA", error.message);
    }
    console.error("Error al actualizar publicación:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo actualizar la publicación. Intenta de nuevo.");
  }
}

/**
 * DELETE /api/listings/[id] — soft delete de una publicación (solo su dueño).
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

  const publicacion = await obtenerPublicacion(id);
  if (!publicacion || publicacion.deletedAt) {
    return respuestaError(404, "NO_ENCONTRADA", "La publicación no existe");
  }
  if (publicacion.ownerId !== session.user.id) {
    return respuestaError(403, "SIN_PERMISO", "No tenés permiso para eliminar esta publicación");
  }

  const resultado = await eliminarPublicacion(id, session.user.id);
  return NextResponse.json({ data: resultado });
}
