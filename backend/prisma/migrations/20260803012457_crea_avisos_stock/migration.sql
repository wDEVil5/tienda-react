-- CreateTable
CREATE TABLE "avisos_stock" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "cliente_id" UUID,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listo_en" TIMESTAMP(3),
    "notificado_en" TIMESTAMP(3),

    CONSTRAINT "avisos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avisos_stock_producto_id_idx" ON "avisos_stock"("producto_id");

-- CreateIndex
CREATE INDEX "avisos_stock_cliente_id_idx" ON "avisos_stock"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "avisos_stock_producto_id_email_key" ON "avisos_stock"("producto_id", "email");

-- AddForeignKey
ALTER TABLE "avisos_stock" ADD CONSTRAINT "avisos_stock_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos_stock" ADD CONSTRAINT "avisos_stock_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
