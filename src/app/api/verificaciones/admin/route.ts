import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listadoAdminSchema } from "@/lib/validation/verificacion";
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
 * GET /api/verificaciones/admin — listado paginado de solicitudes de
 * verificación para el panel admin (RF-33/RF-37), de la más reciente a la más
 * antigua. Requiere sesión de admin (chequeo inline del claim + re-chequeo en
 * DB dentro del service). Acepta `estado` (PENDING/APPROVED/REJECTED),
 * `page` (default 1, se normaliza en el service) y `limit` (1..50, default
 * 10); un fallo de parse responde 400 CUERPO_INVALIDO (decisión 4a). Incluye
 * los documentos adjuntos, solo visibles aquí (RNF-15).
 * Éxito: 200 { data: { solicitudes, total, pagina, tamanioPagina, totalPaginas } }.
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

  const parametros = new URL(request.url).searchParams;
  const parseado = listadoAdminSchema.safeParse({
    estado: parametros.get("estado") || undefined,
    page: parametros.get("page") || undefined,
    limit: parametros.get("limit") || undefined,
  });
  if (!parseado.success) {
    return respuestaError(
      400,
      "CUERPO_INVALIDO",
      parseado.error.issues[0]?.message ??
        "Los parámetros del listado no son válidos"
    );
  }

  try {
    const resultado = await listarSolicitudesVerificacion({
      adminId: session.user.id,
      estado: parseado.data.estado,
      page: parseado.data.page,
      limit: parseado.data.limit,
    });
    return NextResponse.json({ data: resultado });
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