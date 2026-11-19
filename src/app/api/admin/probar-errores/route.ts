import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ErrorDePruebaSentry } from "@/lib/observabilidad";
import { esAdministrador } from "@/lib/reportes";

export const dynamic = "force-dynamic";

function respuestaError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * GET /api/admin/probar-errores — solo ADMIN (claim + base). Lanza un error a
 * propósito: Next lo reporta a Sentry vía `onRequestError` (RNF-14) y el
 * navegador recibe un 500. Sirve para confirmar la configuración.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }
  if (session.user.role !== "ADMIN" || !(await esAdministrador(session.user.id))) {
    return respuestaError(403, "SIN_PERMISO", "Solo un administrador puede usar esta prueba");
  }
  throw new ErrorDePruebaSentry();
}
