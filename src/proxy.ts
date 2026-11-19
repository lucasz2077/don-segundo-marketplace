import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Primera barrera de las páginas privadas: sin cookie de sesión redirige a
 * /sign-in conservando el destino (ruta + query). Es un chequeo optimista
 * (solo mira que la cookie exista): cada página y cada ruta de API vuelve a
 * validar la sesión con `getSession()`, y las de admin además el rol.
 */
export function proxy(request: NextRequest) {
  const sessionToken = getSessionCookie(request);

  if (!sessionToken) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Páginas que exigen sesión. Las APIs (/api/*) responden 401 por su cuenta.
  matcher: [
    "/dashboard/:path*",
    "/perfil/:path*",
    "/compras/:path*",
    "/favoritos/:path*",
    "/mensajes/:path*",
    "/notificaciones/:path*",
    "/publicar/:path*",
    "/admin/:path*",
  ],
};
