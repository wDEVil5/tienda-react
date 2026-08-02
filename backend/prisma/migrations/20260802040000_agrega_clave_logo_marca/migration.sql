-- La URL sirve al frontend; la clave identifica el recurso en el proveedor
-- de almacenamiento y permite reemplazarlo o eliminarlo de forma segura.
ALTER TABLE "marcas" ADD COLUMN "logo_storage_key" VARCHAR(300);
