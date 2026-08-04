-- CreateEnum
CREATE TYPE "EstadoSuscriptor" AS ENUM ('ACTIVO', 'BAJA');

-- CreateTable
CREATE TABLE "suscriptores" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "estado" "EstadoSuscriptor" NOT NULL DEFAULT 'ACTIVO',
    "token" UUID NOT NULL,
    "cliente_id" UUID,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baja_en" TIMESTAMP(3),

    CONSTRAINT "suscriptores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suscriptores_email_key" ON "suscriptores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "suscriptores_token_key" ON "suscriptores"("token");

-- CreateIndex
CREATE INDEX "suscriptores_cliente_id_idx" ON "suscriptores"("cliente_id");

-- AddForeignKey
ALTER TABLE "suscriptores" ADD CONSTRAINT "suscriptores_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
