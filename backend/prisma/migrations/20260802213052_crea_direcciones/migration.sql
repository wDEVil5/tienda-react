-- CreateTable
CREATE TABLE "direcciones" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "etiqueta" VARCHAR(60),
    "calle" VARCHAR(200) NOT NULL,
    "depto" VARCHAR(60),
    "comuna" VARCHAR(80) NOT NULL,
    "region" VARCHAR(80) NOT NULL,
    "instrucciones" VARCHAR(300),
    "predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "direcciones_cliente_id_idx" ON "direcciones"("cliente_id");

-- AddForeignKey
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
