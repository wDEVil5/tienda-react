-- Reseñas/calificaciones de productos. Aditiva: no toca datos existentes.
-- El agregado (suma + conteo) se denormaliza en `productos` para leer promedio y
-- total sin un groupBy por consulta; se mantiene desde el servicio en transacción.

ALTER TABLE "productos"
  ADD COLUMN "resena_suma" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resena_conteo" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "resenas" (
  "id" UUID NOT NULL,
  "producto_id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "calificacion" INTEGER NOT NULL,
  "titulo" VARCHAR(120),
  "cuerpo" VARCHAR(1000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resenas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resenas_producto_id_cliente_id_key" ON "resenas"("producto_id", "cliente_id");
CREATE INDEX "resenas_producto_id_idx" ON "resenas"("producto_id");
CREATE INDEX "resenas_cliente_id_idx" ON "resenas"("cliente_id");

ALTER TABLE "resenas" ADD CONSTRAINT "resenas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Coherente con el endurecimiento de Supabase: RLS deny-all (sin políticas). El
-- backend accede como dueño de la tabla y queda exento; PostgREST/anon no.
ALTER TABLE "resenas" ENABLE ROW LEVEL SECURITY;
