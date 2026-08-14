import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { crearReporteSchema } from "@/lib/validation/reporte";
import {
  AutoReporteError,
  crearReporte,
  LimiteReportesError,
  PublicacionNoDisponibleError,
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
 * POST /api/reportes — crea un reporte sobre una publicación activa.
 * Requiere sesión iniciada. 404 si la publicación no está disponible,
 * 400 si el cuerpo no es válido o si el usuario reporta su propia publicación.
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

  const parseado = crearReporteSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "Los datos del reporte no son válidos"
    );
  }

  try {
    const reporte = await crearReporte(session.user.id, parseado.data);
    return NextResponse.json({ data: reporte }, { status: 201 });
  } catch (error) {
    if (error instanceof PublicacionNoDisponibleError) {
      return respuestaError(404, "NO_ENCONTRADA", error.message);
    }
    if (error instanceof AutoReporteError) {
      return respuestaError(400, "SIN_PERMISO", error.message);
    }
    if (error instanceof LimiteReportesError) {
      return respuestaError(error.status, error.codigo, error.message);
    }
    console.error("Error al crear reporte:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo enviar el reporte. Intenta de nuevo.");
  }
}