import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "../../src/generated/prisma/client";

/**
 * Migración única de datos (RNF-15): los documentos de verificación subidos
 * antes del cambio a assets privados quedaron como imágenes PÚBLICAS de
 * Cloudinary (`dniUrl`/`domicilioUrl`). Este script pasa cada uno a
 * type "authenticated" (rename con to_type, invalidando la caché del CDN) y
 * guarda su public_id en `dniPublicId`/`domicilioPublicId`, limpiando la URL.
 *
 * Por defecto solo muestra lo que haría. Para ejecutarlo:
 *   npx tsx prisma/scripts/privatizar-documentos-verificacion.ts --aplicar
 */

const aplicar = process.argv.includes("--aplicar");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Extrae el public_id de una URL de entrega pública de Cloudinary. */
function publicIdDesdeUrl(url: string): string | null {
  const coincidencia = url.match(
    /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i
  );
  return coincidencia?.[1] ?? null;
}

type Campo = { url: "dniUrl" | "domicilioUrl"; publicId: "dniPublicId" | "domicilioPublicId" };

const CAMPOS: Campo[] = [
  { url: "dniUrl", publicId: "dniPublicId" },
  { url: "domicilioUrl", publicId: "domicilioPublicId" },
];

async function main() {
  const solicitudes = await prisma.solicitudVerificacion.findMany({
    where: {
      OR: [
        { dniUrl: { not: null }, dniPublicId: null },
        { domicilioUrl: { not: null }, domicilioPublicId: null },
      ],
    },
    select: {
      id: true,
      dniUrl: true,
      domicilioUrl: true,
      dniPublicId: true,
      domicilioPublicId: true,
    },
  });

  console.log(
    `${solicitudes.length} solicitudes con documentos públicos${aplicar ? "" : " (modo simulación, usar --aplicar)"}.`
  );

  let migrados = 0;
  let fallidos = 0;

  for (const solicitud of solicitudes) {
    for (const campo of CAMPOS) {
      const url = solicitud[campo.url];
      if (!url || solicitud[campo.publicId]) continue;

      const publicId = publicIdDesdeUrl(url);
      if (!publicId) {
        console.warn(`No se reconoce la URL de ${campo.url} en la solicitud ${solicitud.id}; revisar a mano.`);
        fallidos++;
        continue;
      }

      console.log(`${solicitud.id} ${campo.url}: ${publicId} → authenticated`);
      if (!aplicar) continue;

      try {
        await cloudinary.uploader.rename(publicId, publicId, {
          type: "upload",
          to_type: "authenticated",
          invalidate: true,
        });
        await prisma.solicitudVerificacion.update({
          where: { id: solicitud.id },
          data: { [campo.publicId]: publicId, [campo.url]: null },
        });
        migrados++;
      } catch (error) {
        console.error(`Falló ${campo.url} de la solicitud ${solicitud.id}:`, error);
        fallidos++;
      }
    }
  }

  console.log(`Listo: ${migrados} documentos privatizados, ${fallidos} con error.`);
}

main()
  .catch((error) => {
    console.error("Error al privatizar los documentos de verificación:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
