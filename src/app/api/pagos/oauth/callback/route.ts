import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { completarVinculacionMp, stateOAuth } from "@/lib/pagos/oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/pagos/oauth/callback — recibe el `code` de Mercado Pago tras el
 * consentimiento del vendedor y completa la vinculación (RF-48).
 *
 * Seguridad:
 * - Requiere sesión: sin ella no hay contra qué validar el state CSRF (401).
 * - Valida el `state` contra el token de la sesión activa (design §5): si no
 *   coincide es un intento de CSRF → 400 STATE_INVALIDO sin ningún efecto.
 * - Nunca devuelve tokens ni mpUserId: siempre redirige a /perfil con un
 *   flag de resultado (RNF-20); los errores se loguean sin credenciales.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "SIN_SESION",
          message: "Debes iniciar sesión para vincular Mercado Pago",
        },
      },
      { status: 401 }
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const estadoEsperado = stateOAuth(session.session.token);
  if (!state || state !== estadoEsperado) {
    return NextResponse.json(
      {
        error: {
          code: "STATE_INVALIDO",
          message: "El estado de la vinculación no es válido",
        },
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        error: {
          code: "CODIGO_INVALIDO",
          message: "Falta el código de autorización de Mercado Pago",
        },
      },
      { status: 400 }
    );
  }

  try {
    await completarVinculacionMp({ userId: session.user.id, code });
    return NextResponse.redirect(
      new URL("/perfil?mp=vinculada", request.url),
      302
    );
  } catch (error) {
    // Nunca se loguean tokens ni credenciales (RNF-20); solo el id de usuario
    // y el motivo del error (que no contiene secretos).
    console.error("VINCULACION_MP_FALLIDA", session.user.id, error);
    return NextResponse.redirect(new URL("/perfil?mp=error", request.url), 302);
  }
}
