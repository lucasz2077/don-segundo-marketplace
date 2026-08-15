import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { revisarSolicitudSchema } from "@/lib/validation/verificacion";
import {
  MotivoRechazoRequeridoError,
  revisarSolicitudVerificacion,
  SinPermisoVerificacionError,
  SolicitudNoEncontradaError,
  SolicitudYaRevisadaError,
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
 * PATCH /api/verificaciones/[id] — aprueba o rechaza una solicitud de
 * verificación (RF-33). Requiere sesión de admin (chequeo inline del claim
 * `session.user.role` + re-chequeo en DB dentro del service) y valida el
 * cuerpo con Zod: un fallo de parse responde 400 CUERPO_INVALIDO (decisión
 * 4a). 422 queda reservado a la regla de negocio MOTIVO_RECHAZO_REQUERIDO
 * que impone el service al rechazar.
 * Éxito: 200 { data: { id, estado } }.
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
    return respuestaError(
      403,
      "SIN_PERMISO",
      "Solo los administradores pueden revisar solicitudes de verificación"
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError(
      400,
      "CUERPO_INVALIDO",
      "El cuerpo de la petición no es JSON válido"
    );
  }

  const parseado = revisarSolicitudSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "CUERPO_INVALIDO",
      parseado.error.issues[0]?.message ??
        "Los datos de la revisión no son válidos"
    );
  }

  try {
    const resultado = await revisarSolicitudVerificacion({
      adminId: session.user.id,
      solicitudId: id,
      aprobar: parseado.data.aprobar,
      motivoRechazo: parseado.data.motivoRechazo ?? null,
    });
    return NextResponse.json({ data: resultado });
  } catch (error) {
    if (error instanceof SinPermisoVerificacionError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    if (error instanceof SolicitudNoEncontradaError) {
      return respuestaError(404, "SOLICITUD_NO_ENCONTRADA", error.message);
    }
    if (error instanceof SolicitudYaRevisadaError) {
      return respuestaError(409, "SOLICITUD_YA_REVISADA", error.message);
    }
    if (error instanceof MotivoRechazoRequeridoError) {
      return respuestaError(422, "MOTIVO_RECHAZO_REQUERIDO", error.message);
    }
    console.error("Error al revisar la solicitud de verificación:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudo revisar la solicitud de verificación. Intenta de nuevo."
    );
  }
}