-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(40),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_cliente" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocada_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente_id" UUID NOT NULL,

    CONSTRAINT "sesiones_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE INDEX "clientes_activo_idx" ON "clientes"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_cliente_token_hash_key" ON "sesiones_cliente"("token_hash");

-- CreateIndex
CREATE INDEX "sesiones_cliente_cliente_id_idx" ON "sesiones_cliente"("cliente_id");

-- CreateIndex
CREATE INDEX "sesiones_cliente_expira_en_idx" ON "sesiones_cliente"("expira_en");

-- AddForeignKey
ALTER TABLE "sesiones_cliente" ADD CONSTRAINT "sesiones_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
