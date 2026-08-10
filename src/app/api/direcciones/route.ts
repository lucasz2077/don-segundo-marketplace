import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { crearDireccion } from "@/lib/direcciones";
import { direccionSchema } from "@/lib/validation/direccion";

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
 * POST /api/direcciones — crea una dirección para el usuario autenticado.
 */
export async function POST(request: Request) {
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

  const parseado = direccionSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "Los datos de la dirección no son válidos"
    );
  }

  try {
    const direccion = await crearDireccion(session.user.id, parseado.data);
    return NextResponse.json({ data: direccion }, { status: 201 });
  } catch (error) {
    console.error("Error al crear dirección:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo guardar la dirección. Intenta de nuevo.");
  }
}