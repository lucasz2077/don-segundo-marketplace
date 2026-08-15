-- CreateEnum
CREATE TYPE "CompraEstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'FALLIDO', 'REEMBOLSADO', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "SolicitudDevolucionEstado" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "MotivoReembolso" AS ENUM ('DEVOLUCION_VENDEDOR', 'SIN_STOCK');

-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "aprobado_at" TIMESTAMP(3),
ADD COLUMN     "estado_pago" "CompraEstadoPago" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "fecha_vencimiento" TIMESTAMP(3),
ADD COLUMN     "marketplace_fee" DECIMAL(12,2),
ADD COLUMN     "medio_pago" TEXT,
ADD COLUMN     "motivo_reembolso" "MotivoReembolso",
ADD COLUMN     "mp_payment_id" TEXT,
ADD COLUMN     "mp_preference_id" TEXT,
ADD COLUMN     "reembolsado_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VendedorMpAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mpUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "liveMode" BOOLEAN NOT NULL DEFAULT false,
    "revocadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendedorMpAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudDevolucion" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "compradorId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "estado" "SolicitudDevolucionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT NOT NULL,
    "motivoRechazo" TEXT,
    "montoReembolsado" DECIMAL(12,2),
    "mpRefundId" TEXT,
    "resueltaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudDevolucion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendedorMpAccount_userId_key" ON "VendedorMpAccount"("userId");

-- CreateIndex
CREATE INDEX "VendedorMpAccount_revocadaAt_idx" ON "VendedorMpAccount"("revocadaAt");

-- CreateIndex
CREATE INDEX "SolicitudDevolucion_vendedorId_estado_idx" ON "SolicitudDevolucion"("vendedorId", "estado");

-- CreateIndex
CREATE INDEX "SolicitudDevolucion_compraId_createdAt_idx" ON "SolicitudDevolucion"("compraId", "createdAt");

-- CreateIndex
CREATE INDEX "SolicitudDevolucion_compradorId_createdAt_idx" ON "SolicitudDevolucion"("compradorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Compra_mp_payment_id_key" ON "Compra"("mp_payment_id");

-- CreateIndex
CREATE INDEX "Compra_estado_pago_fecha_vencimiento_idx" ON "Compra"("estado_pago", "fecha_vencimiento");

-- AddForeignKey
ALTER TABLE "VendedorMpAccount" ADD CONSTRAINT "VendedorMpAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudDevolucion" ADD CONSTRAINT "SolicitudDevolucion_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudDevolucion" ADD CONSTRAINT "SolicitudDevolucion_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudDevolucion" ADD CONSTRAINT "SolicitudDevolucion_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill D8 (design §6): las compras legacy pre-pagos son ventas directas ya
-- concretadas (stock ya decrementado). Se marcan APROBADO ancladas a su createdAt
-- (base para la ventana de devolución RF-50); fechaVencimiento queda null (no aplica TTL).
UPDATE "Compra" SET "estado_pago" = 'APROBADO', "aprobado_at" = "createdAt" WHERE "estado_pago" = 'PENDIENTE';
