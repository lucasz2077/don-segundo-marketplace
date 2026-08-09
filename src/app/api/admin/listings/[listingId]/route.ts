import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { obtenerPublicacion } from "@/lib/listings";
import {
  pausarPublicacion,
  PublicacionNoDisponibleError,
  rechazarPublicacion,
  SinPermisoAdminError,
} from "@/lib/reportes";

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

const accionAdminPublicacionSchema = z.object({
  accion: z.enum(["pausar", "rechazar"], {
    message: "La acción solicitada no es válida",
  }),
});

/**
 * PATCH /api/admin/listings/[listingId] — acción de moderación sobre una
 * publicación (solo administrador). "pausar" cambia el estado a PAUSED;
 * "rechazar" cambia el estado a REJECTED y marca deletedAt (deja de verse).
 * 404 si la publicación no existe o ya fue eliminada.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }
  if (session.user.role !== "ADMIN") {
    return respuestaError(403, "SIN_PERMISO", "No tienes permiso para moderar publicaciones");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError(400, "CUERPO_INVALIDO", "El cuerpo de la petición no es JSON válido");
  }

  const parseado = accionAdminPublicacionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "La acción solicitada no es válida"
    );
  }

  try {
    if (parseado.data.accion === "pausar") {
      const publicacion = await obtenerPublicacion(listingId);
      if (!publicacion || publicacion.deletedAt) {
        return respuestaError(404, "NO_ENCONTRADA", "La publicación no existe");
      }
      const resultado = await pausarPublicacion(session.user.id, listingId);
      return NextResponse.json({ data: resultado });
    }

    const resultado = await rechazarPublicacion(session.user.id, listingId);
    return NextResponse.json({ data: resultado });
  } catch (error) {
    if (error instanceof SinPermisoAdminError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    if (error instanceof PublicacionNoDisponibleError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    console.error("Error al moderar publicación:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo aplicar la acción. Intenta de nuevo.");
  }
}