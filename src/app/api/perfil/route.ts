import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { actualizarMiPerfil } from "@/lib/perfiles";
import { actualizarPerfilPublicoSchema } from "@/lib/validation/perfil";

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
 * PATCH /api/perfil — actualiza el perfil público propio (bio y businessName).
 * El dueño siempre es `session.user.id`: la ruta no recibe un id en la URL y
 * el schema `.strict()` rechaza cualquier campo extra (por ejemplo `userId`),
 * así que es imposible apuntar al perfil de otro usuario (REQ-9). El guardado
 * usa lazy upsert: crea el Profile si no existe y actualiza si existe, sin
 * tocar los databaseHooks de Better Auth ni sellerVerified/ratingAvg/ratingCount.
 * 401 sin sesión | 400 cuerpo inválido o validación | 500 error interno.
 */
export async function PATCH(request: NextRequest) {
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

  const parseado = actualizarPerfilPublicoSchema.safeParse(cuerpo);
  if (!parseado.success) {
    return respuestaError(
      400,
      "VALIDACION",
      parseado.error.issues[0]?.message ?? "Los datos del perfil no son válidos"
    );
  }

  try {
    const data = await actualizarMiPerfil(session.user.id, parseado.data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    return respuestaError(
      500,
      "ERROR_INTERNO",
      "No se pudo actualizar el perfil. Intenta de nuevo."
    );
  }
}