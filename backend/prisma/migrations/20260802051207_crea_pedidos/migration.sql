-- CreateEnum
CREATE TYPE "ModalidadEntrega" AS ENUM ('RETIRO', 'DESPACHO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'PREPARANDO', 'LISTO_PARA_RETIRO', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "stock_reservado" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "modalidad" "ModalidadEntrega" NOT NULL,
    "contacto_nombre" VARCHAR(120) NOT NULL,
    "contacto_email" VARCHAR(255) NOT NULL,
    "contacto_telefono" VARCHAR(40) NOT NULL,
    "dir_calle" VARCHAR(200),
    "dir_depto" VARCHAR(60),
    "dir_comuna" VARCHAR(80),
    "dir_region" VARCHAR(80),
    "dir_instrucciones" VARCHAR(300),
    "subtotal" INTEGER NOT NULL,
    "descuento" INTEGER NOT NULL DEFAULT 0,
    "costo_envio" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_pedido" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "producto_id" UUID,
    "nombre" VARCHAR(200) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "precio_normal" INTEGER NOT NULL,
    "precio_final" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "items_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_pedido" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "estado" "EstadoPedido" NOT NULL,
    "nota" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numero_key" ON "pedidos"("numero");

-- CreateIndex
CREATE INDEX "pedidos_estado_idx" ON "pedidos"("estado");

-- CreateIndex
CREATE INDEX "pedidos_created_at_idx" ON "pedidos"("created_at");

-- CreateIndex
CREATE INDEX "items_pedido_pedido_id_idx" ON "items_pedido"("pedido_id");

-- CreateIndex
CREATE INDEX "items_pedido_producto_id_idx" ON "items_pedido"("producto_id");

-- CreateIndex
CREATE INDEX "eventos_pedido_pedido_id_idx" ON "eventos_pedido"("pedido_id");

-- AddForeignKey
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_pedido" ADD CONSTRAINT "eventos_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
