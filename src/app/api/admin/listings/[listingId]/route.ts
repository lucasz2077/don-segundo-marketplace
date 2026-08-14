import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { accionModeracionSchema } from "@/lib/validation/reporte";
import {
  pausarPublicacionReporte,
  PublicacionNoDisponibleError,
  rechazarPublicacionReporte,
  ReporteNoEncontradoError,
  ReporteNoRevisadoError,
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

/**
 * PATCH /api/admin/listings/[listingId] — acción de moderación sobre una
 * publicación en el contexto de un reporte origen (solo administrador).
 * "PAUSED" cambia la publicación a PAUSED; "REJECTED" la cambia a REJECTED y
 * marca deletedAt (deja de verse). Ambas exigen que el reporte esté REVIEWED
 * y quedan auditadas en ModerationAction vinculada a ese reporte (RF-25).
 * 404 si la publicación o el reporte no existen.
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

  const parseado = accionModeracionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "La acción solicitada no es válida"
    );
  }

  try {
    const { accion, reporteId } = parseado.data;
    const resultado =
      accion === "PAUSED"
        ? await pausarPublicacionReporte(session.user.id, listingId, reporteId)
        : await rechazarPublicacionReporte(session.user.id, listingId, reporteId);
    return NextResponse.json({ data: resultado });
  } catch (error) {
    if (error instanceof ReporteNoRevisadoError) {
      return respuestaError(error.status, error.codigo, error.message);
    }
    if (error instanceof ReporteNoEncontradoError) {
      return respuestaError(error.status, error.codigo, error.message);
    }
    if (error instanceof PublicacionNoDisponibleError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    if (error instanceof SinPermisoAdminError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    console.error("Error al moderar publicación:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo aplicar la acción. Intenta de nuevo.");
  }
}