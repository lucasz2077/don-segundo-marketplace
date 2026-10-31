import { randomUUID } from "node:crypto";

/**
 * Titularidad de las imágenes subidas a Cloudinary. Cada imagen se sube con un
 * public_id `<userId>/<uuid>` (dentro de la carpeta de la marca), así el
 * servidor puede comprobar que quien asocia una imagen a una publicación es
 * quien la subió. Sin este chequeo, un usuario podría enviar el `publicId` de
 * una imagen ajena y, al editar o eliminar su publicación, borrarla de
 * Cloudinary (`eliminarImagen`).
 *
 * Módulo sin dependencias del SDK de Cloudinary para poder usarlo en servicios
 * y tests sin configurar credenciales.
 */

/** Genera el public_id de una imagen nueva del usuario: `<userId>/<uuid>`. */
export function generarIdPublicoImagen(userId: string): string {
  return `${userId}/${randomUUID()}`;
}

/**
 * Devuelve true si la imagen fue subida por el usuario: el segmento anterior
 * al nombre del archivo en el `publicId` es su id (Cloudinary puede anteponer
 * la carpeta de la marca), y la URL es de Cloudinary por https y apunta a ese
 * mismo `publicId` (y a la cuenta configurada, si se conoce).
 */
export function imagenPerteneceAUsuario(
  imagen: { url: string; publicId: string },
  userId: string
): boolean {
  const segmentos = imagen.publicId.split("/");
  if (segmentos.length < 2 || segmentos[segmentos.length - 2] !== userId) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(imagen.url);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") {
    return false;
  }

  const cuenta = process.env.CLOUDINARY_CLOUD_NAME;
  if (cuenta && !url.pathname.startsWith(`/${cuenta}/`)) {
    return false;
  }

  return url.pathname.includes(`/${imagen.publicId}`);
}
