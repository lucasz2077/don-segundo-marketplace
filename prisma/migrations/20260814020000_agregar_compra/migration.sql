-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "compradorId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Compra_compradorId_createdAt_idx" ON "Compra"("compradorId", "createdAt");

-- CreateIndex
CREATE INDEX "Compra_listingId_idx" ON "Compra"("listingId");

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
