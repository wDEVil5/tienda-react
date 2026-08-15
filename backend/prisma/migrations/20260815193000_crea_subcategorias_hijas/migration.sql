-- Tercer nivel de navegación: categoría → subcategoría → subcategoría hija.
-- Es opcional en Producto para preservar las clasificaciones ya existentes.
CREATE TABLE "subcategorias_hijas" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "subcategoria_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategorias_hijas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "productos" ADD COLUMN "subcategoria_hija_id" UUID;

CREATE UNIQUE INDEX "subcategorias_hijas_slug_key" ON "subcategorias_hijas"("slug");
CREATE UNIQUE INDEX "subcategorias_hijas_subcategoria_id_nombre_key" ON "subcategorias_hijas"("subcategoria_id", "nombre");
CREATE INDEX "subcategorias_hijas_subcategoria_id_orden_idx" ON "subcategorias_hijas"("subcategoria_id", "orden");
CREATE INDEX "productos_subcategoria_hija_id_idx" ON "productos"("subcategoria_hija_id");

ALTER TABLE "subcategorias_hijas"
  ADD CONSTRAINT "subcategorias_hijas_subcategoria_id_fkey"
  FOREIGN KEY ("subcategoria_id") REFERENCES "subcategorias"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "productos"
  ADD CONSTRAINT "productos_subcategoria_hija_id_fkey"
  FOREIGN KEY ("subcategoria_hija_id") REFERENCES "subcategorias_hijas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
