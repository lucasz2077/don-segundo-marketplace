import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { crearRatingSchema } from "@/lib/validation/rating";
import {
  calificarVenta,
  CompraDeOtroUsuarioError,
  CompraNoEncontradaError,
  obtenerResenasDePublicacion,
  VentanaExpiradaError,
  YaCalificadaError,
} from "@/lib/ratings";

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
 * GET /api/ratings — listado público de reseñas de una publicación (RF-30).
 * No requiere sesión. `listingId` es obligatorio y debe ser un uuid; responde
 * 200 { data: ResenaPublicacion[] } ([] si la publicación no tiene reseñas).
 */
export async function GET(request: NextRequest) {
  const listingId = new URL(request.url).searchParams.get("listingId");
  if (!listingId || !z.string().uuid().safeParse(listingId).success) {
    return respuestaError(400, "CUERPO_INVALIDO", "listingId inválido");
  }

  const resenas = await obtenerResenasDePublicacion(listingId);
  return NextResponse.json({ data: resenas });
}

/**
 * POST /api/ratings — califica una venta (RF-28). Requiere sesión y valida el
 * cuerpo con Zod (compraId uuid, puntaje entero 1-5, comentario opcional ≤500).
 * Errores de dominio tipados: 404 si la compra no existe, 403 si es de otro
 * usuario, 409 si ya fue calificada y 410 si venció la ventana de 30 días.
 * Respuesta de éxito: 200 { data: { id, puntaje } }.
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

  const parseado = crearRatingSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      422,
      "VALIDACION",
      parseado.error.issues[0]?.message ??
        "Los datos de la calificación no son válidos"
    );
  }

  try {
    const rating = await calificarVenta({
      compradorId: session.user.id,
      ...parseado.data,
    });
    return NextResponse.json({ data: rating });
  } catch (error) {
    if (error instanceof CompraNoEncontradaError) {
      return respuestaError(404, "COMPRA_NO_ENCONTRADA", error.message);
    }
    if (error instanceof CompraDeOtroUsuarioError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    if (error instanceof YaCalificadaError) {
      return respuestaError(409, "YA_CALIFICADA", error.message);
    }
    if (error instanceof VentanaExpiradaError) {
      return respuestaError(410, "VENTANA_EXPIRADA", error.message);
    }
    console.error("Error al calificar venta:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudo calificar la venta. Intenta de nuevo."
    );
  }
}
