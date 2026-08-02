-- Se conservan los productos existentes: los que ya eran visibles pasan a
-- PUBLICADO y los inactivos históricos quedan como BORRADOR.
CREATE TYPE "EstadoProducto" AS ENUM ('BORRADOR', 'PUBLICADO', 'ARCHIVADO');

ALTER TABLE "productos"
ADD COLUMN "estado" "EstadoProducto" NOT NULL DEFAULT 'BORRADOR';

UPDATE "productos"
SET "estado" = 'PUBLICADO'
WHERE "activo" = true;

DROP INDEX "productos_activo_idx";
ALTER TABLE "productos" DROP COLUMN "activo";
CREATE INDEX "productos_estado_idx" ON "productos"("estado");
