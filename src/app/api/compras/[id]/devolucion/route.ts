import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { solicitarDevolucionSchema } from "@/lib/validation/pagos";
import {
  CompraDeOtroUsuarioError,
  CompraNoAprobadaError,
  CompraNoEncontradaError,
  DevolucionYaPendienteError,
  solicitarDevolucion,
  VentanaDevolucionExpiradaError,
} from "@/lib/compras";

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

// El compraId sale del path, no del body (RF-49): se valida como uuid y el
// resto del schema (motivo 10..500) se conserva tal cual.
const cuerpoSolicitudSchema = solicitarDevolucionSchema.omit({ compraId: true });

/**
 * POST /api/compras/[id]/devolucion — el COMPRADOR solicita la devolución de
 * una compra pagada (RF-49/RF-50). Requiere sesión; el id del path es el uuid
 * de la Compra (400 CUERPO_INVALIDO si no lo es) y el body es
 * `solicitarDevolucionSchema` sin `compraId` (motivo 10..500; 422 VALIDACION
 * si no valida). Errores de dominio tipados: 404 COMPRA_NO_ENCONTRADA, 403
 * SIN_PERMISO, 409 COMPRA_NO_APROBADA o DEVO_YA_PENDIENTE, 410
 * VENTANA_EXPIRADA. Respuesta de éxito: 201 { data: solicitud }.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  if (!z.string().uuid().safeParse(id).success) {
    return respuestaError(400, "CUERPO_INVALIDO", "compraId inválido");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await _request.json();
  } catch {
    return respuestaError(
      400,
      "CUERPO_INVALIDO",
      "El cuerpo de la petición no es JSON válido"
    );
  }

  const parseado = cuerpoSolicitudSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      422,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "El motivo de la devolución no es válido"
    );
  }

  try {
    const solicitud = await solicitarDevolucion({
      compradorId: session.user.id,
      compraId: id,
      motivo: parseado.data.motivo,
    });
    return NextResponse.json({ data: solicitud }, { status: 201 });
  } catch (error) {
    if (error instanceof CompraNoEncontradaError) {
      return respuestaError(404, "COMPRA_NO_ENCONTRADA", error.message);
    }
    if (error instanceof CompraDeOtroUsuarioError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    if (error instanceof CompraNoAprobadaError) {
      return respuestaError(409, "COMPRA_NO_APROBADA", error.message);
    }
    if (error instanceof DevolucionYaPendienteError) {
      return respuestaError(409, "DEVO_YA_PENDIENTE", error.message);
    }
    if (error instanceof VentanaDevolucionExpiradaError) {
      return respuestaError(410, "VENTANA_EXPIRADA", error.message);
    }
    console.error("Error al solicitar la devolución:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudo solicitar la devolución. Intenta de nuevo."
    );
  }
}