import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { completarVinculacionMp, stateOAuth } from "@/lib/pagos/oauth";

export const dynamic = "force-dynamic";

/** Vuelve a /perfil con el resultado de la vinculación (`?mp=`). */
function volverAlPerfil(request: NextRequest, resultado: "vinculada" | "cancelado" | "error") {
  return NextResponse.redirect(new URL(`/perfil?mp=${resultado}`, request.url), 302);
}

/**
 * GET /api/pagos/oauth/callback — recibe el `code` de Mercado Pago tras el
 * consentimiento del vendedor y completa la vinculación (RF-48).
 *
 * Seguridad:
 * - Requiere sesión: sin ella no hay contra qué validar el state CSRF; se
 *   redirige al login y de ahí al perfil.
 * - Valida el `state` contra el token de la sesión activa (design §5): si no
 *   coincide es un intento de CSRF y no se vincula nada.
 * - Nunca devuelve tokens ni mpUserId: siempre redirige a /perfil con el
 *   resultado (`?mp=vinculada|cancelado|error`, RNF-20); los errores se
 *   loguean sin credenciales.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in?redirect=/perfil", request.url), 302);
  }

  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const estadoEsperado = stateOAuth(session.session.token);
  if (!state || state !== estadoEsperado) {
    console.error("VINCULACION_MP_STATE_INVALIDO", session.user.id);
    return volverAlPerfil(request, "error");
  }

  // Sin `code`, el vendedor canceló o MP devolvió un error (p. ej. access_denied).
  if (!code) {
    return volverAlPerfil(request, "cancelado");
  }

  try {
    await completarVinculacionMp({ userId: session.user.id, code });
    return volverAlPerfil(request, "vinculada");
  } catch (error) {
    // Nunca se loguean tokens ni credenciales (RNF-20): solo el usuario y lo
    // que respondió MP (estado y mensaje), que no contienen secretos.
    const detalle =
      typeof error === "object" && error !== null
        ? {
            status: (error as { status?: unknown }).status,
            mensaje: (error as { message?: unknown }).message,
            causa: (error as { cause?: unknown }).cause,
          }
        : { mensaje: String(error) };
    console.error("VINCULACION_MP_FALLIDA", session.user.id, detalle);
    return volverAlPerfil(request, "error");
  }
}
