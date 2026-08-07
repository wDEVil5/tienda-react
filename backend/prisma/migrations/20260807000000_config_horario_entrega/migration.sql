-- AlterTable: nueva ventana de entrega. Se agrega con DEFAULT para rellenar la
-- fila singleton existente y luego se quita el default (el valor lo provee
-- siempre el servicio / REGLAS_POR_DEFECTO, igual que el resto de la config).
ALTER TABLE "configuracion_tienda"
  ADD COLUMN "horario_entrega" VARCHAR(120) NOT NULL DEFAULT 'Lun a Vie · 09:00 a 18:00';
ALTER TABLE "configuracion_tienda" ALTER COLUMN "horario_entrega" DROP DEFAULT;
