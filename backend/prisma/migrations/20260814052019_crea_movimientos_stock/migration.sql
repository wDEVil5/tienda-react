-- CreateEnum
CREATE TYPE "MotivoMovimientoStock" AS ENUM ('ENTRADA', 'MERMA', 'CONTEO');

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "usuario_id" UUID,
    "delta" INTEGER NOT NULL,
    "motivo" "MotivoMovimientoStock" NOT NULL,
    "stock_resultante" INTEGER NOT NULL,
    "nota" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimientos_stock_producto_id_created_at_idx" ON "movimientos_stock"("producto_id", "created_at");

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
