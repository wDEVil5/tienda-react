-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "subcategoria_id" UUID;

-- CreateTable
CREATE TABLE "subcategorias" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "categoria_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subcategorias_slug_key" ON "subcategorias"("slug");

-- CreateIndex
CREATE INDEX "subcategorias_categoria_id_orden_idx" ON "subcategorias"("categoria_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "subcategorias_categoria_id_nombre_key" ON "subcategorias"("categoria_id", "nombre");

-- AddForeignKey
ALTER TABLE "subcategorias" ADD CONSTRAINT "subcategorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "subcategorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
