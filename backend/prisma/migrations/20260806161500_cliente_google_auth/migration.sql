-- AlterTable: la contraseña pasa a opcional (cuentas creadas solo con Google no
-- la tienen) y se agrega el identificador estable de Google (claim `sub`).
ALTER TABLE "clientes" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "clientes" ADD COLUMN "google_id" VARCHAR(255);

-- CreateIndex: único para que dos clientes no enlacen la misma cuenta de Google.
CREATE UNIQUE INDEX "clientes_google_id_key" ON "clientes"("google_id");
