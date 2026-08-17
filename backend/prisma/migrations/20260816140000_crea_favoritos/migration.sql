-- Lista de deseos del cliente: favoritos (cliente ↔ producto). Aditiva: no toca
-- datos existentes. Ambas FK en cascada; único por (cliente, producto).
CREATE TABLE "favoritos" (
  "id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "producto_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favoritos_cliente_id_producto_id_key" ON "favoritos"("cliente_id", "producto_id");
CREATE INDEX "favoritos_cliente_id_idx" ON "favoritos"("cliente_id");
CREATE INDEX "favoritos_producto_id_idx" ON "favoritos"("producto_id");

ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Coherente con el endurecimiento de Supabase: RLS deny-all (sin políticas). El
-- backend accede como dueño de la tabla y queda exento; PostgREST/anon no.
ALTER TABLE "favoritos" ENABLE ROW LEVEL SECURITY;
