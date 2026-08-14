/*
  Warnings:

  - You are about to drop the column `horario_atencion` on the `identidad_tienda` table. All the data in the column will be lost.
  - Added the required column `horario` to the `identidad_tienda` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "identidad_tienda" DROP COLUMN "horario_atencion",
ADD COLUMN     "horario" JSONB NOT NULL;
