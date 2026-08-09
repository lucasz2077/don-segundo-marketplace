import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { actualizarEstadoReporteSchema } from "@/lib/validation/reporte";
import {
  actualizarEstadoReporte,
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
 * PATCH /api/reportes/[id] — actualiza el estado de un reporte (solo
 * administrador). Valida el rol real en la base de datos mediante
 * esAdministrador. 404 si el reporte no existe.
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
  if (session.user.role !== "ADMIN") {
    return respuestaError(403, "SIN_PERMISO", "No tienes permiso para administrar reportes");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError(400, "CUERPO_INVALIDO", "El cuerpo de la petición no es JSON válido");
  }

  const parseado = actualizarEstadoReporteSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "El estado del reporte no es válido"
    );
  }

  try {
    const reporte = await actualizarEstadoReporte(
      session.user.id,
      id,
      parseado.data.estado
    );
    if (!reporte) {
      return respuestaError(404, "NO_ENCONTRADA", "El reporte no existe");
    }
    return NextResponse.json({ data: reporte });
  } catch (error) {
    if (error instanceof SinPermisoAdminError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    console.error("Error al actualizar estado del reporte:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo actualizar el reporte. Intenta de nuevo.");
  }
}