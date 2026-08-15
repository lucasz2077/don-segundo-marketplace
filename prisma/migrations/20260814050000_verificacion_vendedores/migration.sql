-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SolicitudVerificacionEstado" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: conversión de Profile.sellerVerified (boolean) a
-- Profile.seller_verified ("VerificationStatus"). PostgreSQL no castea boolean
-- a enum de forma implícita, por eso se agrega la columna nueva, se migran los
-- valores (false → 'NONE', true → 'VERIFIED') y se descarta la columna vieja.
ALTER TABLE "Profile" ADD COLUMN "seller_verified" "VerificationStatus" NOT NULL DEFAULT 'NONE';

UPDATE "Profile"
SET "seller_verified" = CASE
    WHEN "sellerVerified" THEN 'VERIFIED'::"VerificationStatus"
    ELSE 'NONE'::"VerificationStatus"
END;

ALTER TABLE "Profile" DROP COLUMN "sellerVerified";

-- CreateTable
CREATE TABLE "SolicitudVerificacion" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "dniUrl" TEXT,
    "domicilioUrl" TEXT,
    "estado" "SolicitudVerificacionEstado" NOT NULL DEFAULT 'PENDING',
    "motivoRechazo" TEXT,
    "adminId" TEXT,
    "revisadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudVerificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitudVerificacion_vendedorId_createdAt_idx" ON "SolicitudVerificacion"("vendedorId", "createdAt");

-- AddForeignKey
ALTER TABLE "SolicitudVerificacion" ADD CONSTRAINT "SolicitudVerificacion_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudVerificacion" ADD CONSTRAINT "SolicitudVerificacion_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;