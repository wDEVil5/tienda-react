-- CreateTable
CREATE TABLE "promociones" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "porcentaje_descuento" INTEGER NOT NULL,
    "empieza_en" TIMESTAMP(3) NOT NULL,
    "termina_en" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promocion_productos" (
    "promocion_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promocion_productos_pkey" PRIMARY KEY ("promocion_id","producto_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promociones_slug_key" ON "promociones"("slug");

-- CreateIndex
CREATE INDEX "promociones_activa_empieza_en_termina_en_idx" ON "promociones"("activa", "empieza_en", "termina_en");

-- CreateIndex
CREATE INDEX "promocion_productos_producto_id_idx" ON "promocion_productos"("producto_id");

-- AddForeignKey
ALTER TABLE "promocion_productos" ADD CONSTRAINT "promocion_productos_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promociones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promocion_productos" ADD CONSTRAINT "promocion_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
