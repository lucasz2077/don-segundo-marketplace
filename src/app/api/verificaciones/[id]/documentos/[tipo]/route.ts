import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { descargarDocumentoPrivado } from "@/lib/cloudinary";
import { tipoDocumentoVerificacionSchema } from "@/lib/validation/verificacion";
import {
  obtenerDocumentoVerificacion,
  SinPermisoVerificacionError,
  SolicitudNoEncontradaError,
} from "@/lib/verificaciones";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
 * GET /api/verificaciones/[id]/documentos/[tipo] — entrega un documento de
 * una solicitud de verificación (tipo "dni" | "domicilio") SOLO a un admin
 * (RNF-15: claim de sesión + re-chequeo en DB en el service). Los documentos
 * privados se descargan server-side con URL firmada y se devuelven sin caché;
 * la URL de Cloudinary nunca llega al navegador. Las solicitudes anteriores
 * con URL pública (legado) redirigen a esa URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tipo: string }> }
) {
  const { id, tipo } = await params;

  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión");
  }
  if (session.user.role !== "ADMIN") {
    return respuestaError(
      403,
      "SIN_PERMISO",
      "Solo los administradores pueden ver los documentos de verificación"
    );
  }

  const tipoParseado = tipoDocumentoVerificacionSchema.safeParse(tipo);
  if (!tipoParseado.success) {
    return respuestaError(404, "DOCUMENTO_NO_ENCONTRADO", "El documento no existe");
  }

  try {
    const documento = await obtenerDocumentoVerificacion({
      adminId: session.user.id,
      solicitudId: id,
      tipo: tipoParseado.data,
    });
    if (!documento) {
      return respuestaError(404, "DOCUMENTO_NO_ENCONTRADO", "La solicitud no tiene ese documento");
    }
    if (documento.tipo === "legado") {
      // Solo se redirige a URLs https (las legadas son de Cloudinary).
      if (!documento.url.startsWith("https://")) {
        return respuestaError(404, "DOCUMENTO_NO_ENCONTRADO", "El documento no existe");
      }
      return NextResponse.redirect(documento.url, 302);
    }

    const archivo = await descargarDocumentoPrivado(documento.publicId);
    return new NextResponse(archivo.body, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (error instanceof SinPermisoVerificacionError) {
      return respuestaError(403, "SIN_PERMISO", error.message);
    }
    if (error instanceof SolicitudNoEncontradaError) {
      return respuestaError(404, "SOLICITUD_NO_ENCONTRADA", error.message);
    }
    console.error("Error al entregar el documento de verificación:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo obtener el documento. Intenta de nuevo.");
  }
}
