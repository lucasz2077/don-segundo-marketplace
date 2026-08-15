import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { obtenerMiVerificacion } from "@/lib/verificaciones";

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
 * GET /api/verificaciones/mias — estado de verificación del vendedor logueado
 * (RF-32) y su solicitud más reciente. No expone los documentos adjuntos
 * (RNF-15). Éxito: 200 { data: { estado, solicitud } }.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }

  try {
    const resultado = await obtenerMiVerificacion(session.user.id);
    return NextResponse.json({ data: resultado });
  } catch (error) {
    console.error("Error al obtener el estado de verificación:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudo obtener el estado de verificación. Intenta de nuevo."
    );
  }
}