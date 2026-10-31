import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Carpeta donde se guardan las imágenes de las publicaciones. */
export const CARPETA_CLOUDINARY = "don-segundo";

/**
 * Carpeta de los documentos de verificación de vendedores (RNF-15). Se suben
 * como assets privados (type "authenticated"): no tienen URL pública y solo
 * se entregan con una URL firmada que genera el servidor.
 */
export const CARPETA_VERIFICACIONES = "don-segundo-verificaciones";

export type ImagenSubida = {
  url: string;
  publicId: string;
};

/** Sube un buffer con `upload_stream` y resuelve con el resultado de Cloudinary. */
function subirBuffer(
  buffer: Buffer,
  opciones: { folder: string; public_id: string; type: "upload" | "authenticated" }
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { ...opciones, resource_type: "image" },
      (error, resultado) => {
        if (error || !resultado) {
          reject(error ?? new Error("Cloudinary no devolvió un resultado"));
          return;
        }
        resolve(resultado);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Sube una imagen a Cloudinary dentro de la carpeta de la marca.
 * Si no se indica publicId, se genera un identificador aleatorio.
 */
export async function subirImagen(
  buffer: Buffer,
  publicId: string = randomUUID()
): Promise<ImagenSubida> {
  const resultado = await subirBuffer(buffer, {
    folder: CARPETA_CLOUDINARY,
    public_id: publicId,
    type: "upload",
  });
  return { url: resultado.secure_url, publicId: resultado.public_id };
}

/**
 * Sube un documento de verificación como asset PRIVADO (RNF-15). Devuelve solo
 * el public_id: la URL de entrega no sirve sin firma y nunca se expone.
 */
export async function subirDocumentoPrivado(
  buffer: Buffer,
  publicId: string
): Promise<{ publicId: string }> {
  const resultado = await subirBuffer(buffer, {
    folder: CARPETA_VERIFICACIONES,
    public_id: publicId,
    type: "authenticated",
  });
  return { publicId: resultado.public_id };
}

/**
 * Descarga server-side un documento privado con una URL firmada (RNF-15). Se
 * pide siempre en JPG: Cloudinary convierte el original y así nunca se entrega
 * un formato activo (p. ej. SVG). Lanza si Cloudinary no responde 200.
 */
export async function descargarDocumentoPrivado(publicId: string): Promise<Response> {
  const url = cloudinary.url(publicId, {
    type: "authenticated",
    resource_type: "image",
    format: "jpg",
    sign_url: true,
    secure: true,
  });
  const respuesta = await fetch(url, { cache: "no-store" });
  if (!respuesta.ok) {
    throw new Error(`Cloudinary respondió ${respuesta.status} al descargar el documento`);
  }
  return respuesta;
}

/**
 * Elimina una imagen de Cloudinary por su public_id.
 * No falla si el asset ya no existe (best effort).
 */
export async function eliminarImagen(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
