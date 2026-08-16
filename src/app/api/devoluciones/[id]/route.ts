import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { resolverDevolucionSchema } from "@/lib/validation/pagos";
import {
  resolverDevolucion,
  SolicitudDeOtroVendedorError,
  SolicitudNoEncontradaError,
  SolicitudYaResueltaError,
} from "@/lib/compras";
import { ReembolsoFallidoError } from "@/lib/pagos/reembolsos";

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
 * POST /api/devoluciones/[id] — el VENDEDOR resuelve una solicitud de
 * devolución (RF-49..RF-51): aprueba (reembolso completo, RF-51) o rechaza
 * con motivo. Requiere sesión; el id del path es el uuid de la Solicitud
 * (400 CUERPO_INVALIDO si no lo es) y el body es `resolverDevolucionSchema`
 * (`accion` aprobar|rechazar, `motivoRechazo` ≤500 obligatorio al rechazar;
 * 422 VALIDACION si no valida). Errores de dominio tipados: 404
 * SOLICITUD_NO_ENCONTRADA, 403 SIN_PERMISO, 409 YA_RESUELTA, 502
 * PAGO_INDISPONIBLE cuando el refund falla sin que la solicitud llegue a
 * resolverse (compra sin pago en MP; decisión 5.2). Si el refund falla
 * DESPUÉS de resolver la solicitud (tx ya persistida: APROBADA + compra
 * REEMBOLSADO), se responde 200 con una advertencia y el fallo queda logueado
 * (`REEMBOLSO_FALLIDO`) para operación manual. Éxito: 200 { data }.
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
    return respuestaError(400, "CUERPO_INVALIDO", "solicitudId inválido");
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

  const parseado = resolverDevolucionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      422,
      "VALIDACION",
      parseado.error.issues[0]?.message ??
        "Los datos de la resolución no son válidos"
    );
  }

  try {
    const resultado = await resolverDevolucion({
      vendedorId: session.user.id,
      solicitudId: id,
      accion: parseado.data.accion,
      motivoRechazo: parseado.data.motivoRechazo,
    });

    // Decisión 5.2: el refund real en MP falló post-commit (la solicitud ya
    // quedó resuelta). Se responde 200 con advertencia; el fallo ya fue
    // logueado como REEMBOLSO_FALLIDO para conciliación manual.
    if (!resultado.reembolsoExitoso) {
      return NextResponse.json({
        data: {
          solicitud: resultado.solicitud,
          advertencia:
            "La solicitud quedó aprobada pero el reembolso en Mercado Pago falló; se registró para revisión.",
        },
      });
    }

    return NextResponse.json({ data: { solicitud: resultado.solicitud } });
  } catch (error) {
    if (error instanceof SolicitudNoEncontradaError) {
      return respuestaError(404, "SOLICITUD_NO_ENCONTRADA", error.message);
    }
    if (error instanceof SolicitudDeOtroVendedorError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    if (error instanceof SolicitudYaResueltaError) {
      return respuestaError(409, "YA_RESUELTA", error.message);
    }
    if (error instanceof ReembolsoFallidoError) {
      return respuestaError(502, "PAGO_INDISPONIBLE", error.message);
    }
    console.error("Error al resolver la devolución:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudo resolver la devolución. Intenta de nuevo."
    );
  }
}