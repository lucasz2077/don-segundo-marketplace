import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { obtenerAutorizacionMpUrl, stateOAuth } from "@/lib/pagos/oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/pagos/oauth/iniciar — inicia la vinculación de la cuenta de
 * Mercado Pago del vendedor (RF-48). Requiere sesión; redirige (302) a la URL
 * de autorización de MP con un `state` CSRF derivado del token de sesión
 * (httpOnly, design §5). Si faltan las credenciales MP responde 500 sin
 * exponer ningún secreto (RNF-20).
 */
export async function GET(_request: NextRequest) {
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

  const estado = stateOAuth(session.session.token);

  let urlAutorizacion: string;
  try {
    urlAutorizacion = obtenerAutorizacionMpUrl(estado);
  } catch (error) {
    console.error("OAUTH_CONFIGURACION_INCOMPLETA", error);
    return NextResponse.json(
      {
        error: {
          code: "ERROR_INTERNO",
          message: "Faltan variables de entorno de Mercado Pago",
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.redirect(urlAutorizacion, 302);
}
