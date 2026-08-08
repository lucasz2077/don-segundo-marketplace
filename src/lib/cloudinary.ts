import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Carpeta donde se guardan las imágenes de las publicaciones. */
export const CARPETA_CLOUDINARY = "don-segundo";

export type ImagenSubida = {
  url: string;
  publicId: string;
};

/**
 * Sube una imagen a Cloudinary dentro de la carpeta de la marca.
 * Si no se indica publicId, se genera un identificador aleatorio.
 */
export function subirImagen(
  buffer: Buffer,
  publicId: string = randomUUID()
): Promise<ImagenSubida> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CARPETA_CLOUDINARY,
        public_id: publicId,
        resource_type: "image",
      },
      (error, resultado) => {
        if (error || !resultado) {
          reject(error ?? new Error("Cloudinary no devolvió un resultado"));
          return;
        }
        resolve({ url: resultado.secure_url, publicId: resultado.public_id });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Elimina una imagen de Cloudinary por su public_id.
 * No falla si el asset ya no existe (best effort).
 */
export async function eliminarImagen(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
