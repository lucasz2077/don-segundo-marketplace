-- RNF-15: los documentos de verificación pasan a ser assets privados de
-- Cloudinary (type "authenticated"); se guarda solo su public_id. Las columnas
-- dniUrl/domicilioUrl quedan para las solicitudes anteriores (legado).
ALTER TABLE "SolicitudVerificacion" ADD COLUMN "dniPublicId" TEXT,
ADD COLUMN "domicilioPublicId" TEXT;
