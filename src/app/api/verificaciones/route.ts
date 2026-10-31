import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { crearSolicitudVerificacionSchema } from "@/lib/validation/verificacion";
import {
  DocumentoInvalidoError,
  NoEsVendedorError,
  SolicitudYaPendienteError,
  solicitarVerificacion,
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
 * POST /api/verificaciones — solicita la verificación del vendedor logueado
 * (RF-32). Requiere sesión, valida el cuerpo con Zod (dniPublicId obligatorio,
 * domicilioPublicId opcional: public_id de documentos privados subidos por
 * POST /api/verificaciones/documentos, RNF-15) y mapea los errores de dominio
 * tipados. El listado
 * admin y el estado propio viven en rutas separadas (admin/ y mias/).
 * Éxito: 200 { data: { id, estado } }.
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
    return respuestaError(
      400,
      "CUERPO_INVALIDO",
      "El cuerpo de la petición no es JSON válido"
    );
  }

  const parseado = crearSolicitudVerificacionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "CUERPO_INVALIDO",
      parseado.error.issues[0]?.message ??
        "Los datos de la solicitud no son válidos"
    );
  }

  try {
    const solicitud = await solicitarVerificacion({
      vendedorId: session.user.id,
      dniPublicId: parseado.data.dniPublicId,
      domicilioPublicId: parseado.data.domicilioPublicId,
    });
    return NextResponse.json({ data: solicitud });
  } catch (error) {
    if (error instanceof SolicitudYaPendienteError) {
      return respuestaError(409, "SOLICITUD_YA_PENDIENTE", error.message);
    }
    if (error instanceof NoEsVendedorError) {
      return respuestaError(403, "NO_ES_VENDEDOR", error.message);
    }
    if (error instanceof DocumentoInvalidoError) {
      return respuestaError(400, "DOCUMENTO_INVALIDO", error.message);
    }
    console.error("Error al solicitar la verificación:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudo crear la solicitud de verificación. Intenta de nuevo."
    );
  }
}