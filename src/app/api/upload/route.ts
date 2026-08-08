import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { subirImagen } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Tamaño máximo de imagen en bytes (5 MB). */
const MAX_TAMANIO_IMAGEN = 5 * 1024 * 1024;

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
 * POST /api/upload — recibe un archivo de imagen (FormData, campo "imagen"),
 * lo sube a Cloudinary y devuelve { url, publicId, alt }. Requiere sesión.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return respuestaError(401, "NO_AUTENTICADO", "Debes iniciar sesión para subir imágenes");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return respuestaError(400, "FORMULARIO_INVALIDO", "No se pudo leer el formulario");
  }

  const archivo = formData.get("imagen");
  if (!(archivo instanceof File)) {
    return respuestaError(400, "SIN_ARCHIVO", "Debes enviar un archivo de imagen");
  }
  if (archivo.size === 0) {
    return respuestaError(400, "ARCHIVO_VACIO", "El archivo está vacío");
  }
  if (archivo.size > MAX_TAMANIO_IMAGEN) {
    return respuestaError(400, "ARCHIVO_GRANDE", "La imagen supera los 5 MB");
  }
  if (!archivo.type.startsWith("image/")) {
    return respuestaError(400, "TIPO_INVALIDO", "El archivo debe ser una imagen (JPG, PNG, WebP, etc.)");
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  try {
    const imagen = await subirImagen(buffer, randomUUID());
    return NextResponse.json(
      { data: { url: imagen.url, publicId: imagen.publicId, alt: archivo.name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al subir imagen a Cloudinary:", error);
    return respuestaError(500, "ERROR_INTERNO", "No se pudo subir la imagen. Intenta de nuevo.");
  }
}
