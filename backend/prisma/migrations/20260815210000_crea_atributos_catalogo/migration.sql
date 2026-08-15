-- Facetas configurables por categoría. Son aditivas: ningún producto existente
-- queda obligado a tener atributos hasta que el administrador los configure.
CREATE TYPE "TipoAtributoCatalogo" AS ENUM ('SELECCION', 'BOOLEAN');

CREATE TABLE "atributos_categoria" (
  "id" UUID NOT NULL,
  "nombre" VARCHAR(80) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "tipo" "TipoAtributoCatalogo" NOT NULL DEFAULT 'SELECCION',
  "categoria_id" UUID NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "atributos_categoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "opciones_atributo" (
  "id" UUID NOT NULL,
  "nombre" VARCHAR(80) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "atributo_id" UUID NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "opciones_atributo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "producto_atributos" (
  "producto_id" UUID NOT NULL,
  "atributo_id" UUID NOT NULL,
  "opcion_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "producto_atributos_pkey" PRIMARY KEY ("producto_id", "atributo_id")
);

CREATE UNIQUE INDEX "atributos_categoria_slug_key" ON "atributos_categoria"("slug");
CREATE UNIQUE INDEX "atributos_categoria_categoria_id_nombre_key" ON "atributos_categoria"("categoria_id", "nombre");
CREATE INDEX "atributos_categoria_categoria_id_orden_idx" ON "atributos_categoria"("categoria_id", "orden");
CREATE UNIQUE INDEX "opciones_atributo_slug_key" ON "opciones_atributo"("slug");
CREATE UNIQUE INDEX "opciones_atributo_atributo_id_nombre_key" ON "opciones_atributo"("atributo_id", "nombre");
CREATE INDEX "opciones_atributo_atributo_id_orden_idx" ON "opciones_atributo"("atributo_id", "orden");
CREATE INDEX "producto_atributos_atributo_id_opcion_id_idx" ON "producto_atributos"("atributo_id", "opcion_id");

ALTER TABLE "atributos_categoria" ADD CONSTRAINT "atributos_categoria_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opciones_atributo" ADD CONSTRAINT "opciones_atributo_atributo_id_fkey" FOREIGN KEY ("atributo_id") REFERENCES "atributos_categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producto_atributos" ADD CONSTRAINT "producto_atributos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producto_atributos" ADD CONSTRAINT "producto_atributos_atributo_id_fkey" FOREIGN KEY ("atributo_id") REFERENCES "atributos_categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "producto_atributos" ADD CONSTRAINT "producto_atributos_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "opciones_atributo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
