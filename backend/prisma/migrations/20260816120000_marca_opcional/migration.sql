-- La marca de un producto pasa a ser OPCIONAL: un producto puede no tener marca.
-- Y al borrar una marca, sus productos quedan sin marca (SET NULL) en vez de
-- bloquear el borrado (antes era RESTRICT).

-- La columna admite NULL.
ALTER TABLE "productos" ALTER COLUMN "marca_id" DROP NOT NULL;

-- Rehacemos la FK con ON DELETE SET NULL.
ALTER TABLE "productos" DROP CONSTRAINT "productos_marca_id_fkey";
ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
