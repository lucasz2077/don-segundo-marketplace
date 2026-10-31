import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { subirDocumentoPrivado } from "@/lib/cloudinary";
import { generarIdPublicoImagen } from "@/lib/imagenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Tamaño máximo del documento en bytes (5 MB). */
const MAX_TAMANIO_DOCUMENTO = 5 * 1024 * 1024;

/** Formatos de imagen aceptados (sin SVG ni otros formatos activos). */
const TIPOS_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

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
 * POST /api/verificaciones/documentos — sube un documento de verificación
 * (FormData, campo "documento") como asset PRIVADO de Cloudinary (RNF-15).
 * Requiere sesión. Devuelve solo { publicId, nombre }: nunca una URL, porque
 * el documento únicamente lo ve el admin por
 * GET /api/verificaciones/[id]/documentos/[tipo].
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión para subir documentos");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return respuestaError(400, "FORMULARIO_INVALIDO", "No se pudo leer el formulario");
  }

  const archivo = formData.get("documento");
  if (!(archivo instanceof File)) {
    return respuestaError(400, "SIN_ARCHIVO", "Debes enviar el archivo del documento");
  }
  if (archivo.size === 0) {
    return respuestaError(400, "ARCHIVO_VACIO", "El archivo está vacío");
  }
  if (archivo.size > MAX_TAMANIO_DOCUMENTO) {
    return respuestaError(400, "ARCHIVO_GRANDE", "El documento supera los 5 MB");
  }
  if (!TIPOS_PERMITIDOS.has(archivo.type)) {
    return respuestaError(
      400,
      "TIPO_INVALIDO",
      "El documento debe ser una foto en JPG, PNG, WebP o HEIC"
    );
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  try {
    // El public_id lleva el id del usuario para validar la titularidad al
    // crear la solicitud (ver src/lib/imagenes.ts).
    const { publicId } = await subirDocumentoPrivado(
      buffer,
      generarIdPublicoImagen(session.user.id)
    );
    return NextResponse.json(
      { data: { publicId, nombre: archivo.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al subir documento de verificación a Cloudinary:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo subir el documento. Intenta de nuevo.");
  }
}
