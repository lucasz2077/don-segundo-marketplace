import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { estadoSolicitudSchema } from "@/lib/validation/verificacion";
import {
  listarSolicitudesVerificacion,
  SinPermisoVerificacionError,
} from "@/lib/verificaciones";

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
 * GET /api/verificaciones/admin — listado de solicitudes de verificación para
 * el panel admin (RF-33), de la más reciente a la más antigua. Requiere sesión
 * de admin (chequeo inline del claim + re-chequeo en DB dentro del service).
 * `estado` (PENDING/APPROVED/REJECTED) es un filtro opcional. Incluye los
 * documentos adjuntos, solo visibles aquí (RNF-15).
 * Éxito: 200 { data: { solicitudes, total } }.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }
  if (session.user.role !== "ADMIN") {
    return respuestaError(
      403,
      "SIN_PERMISO",
      "Solo los administradores pueden ver las solicitudes de verificación"
    );
  }

  const estadoParam = new URL(request.url).searchParams.get("estado");
  let estado: string | undefined;
  if (estadoParam) {
    const parseado = estadoSolicitudSchema.safeParse(estadoParam);
    if (!parseado.success) {
      return respuestaError(
        400,
        "CUERPO_INVALIDO",
        parseado.error.issues[0]?.message ?? "El estado no es válido"
      );
    }
    estado = parseado.data;
  }

  try {
    const solicitudes = await listarSolicitudesVerificacion({
      adminId: session.user.id,
      estado,
    });
    return NextResponse.json({
      data: { solicitudes, total: solicitudes.length },
    });
  } catch (error) {
    if (error instanceof SinPermisoVerificacionError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    console.error("Error al listar las solicitudes de verificación:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudieron listar las solicitudes de verificación. Intenta de nuevo."
    );
  }
}