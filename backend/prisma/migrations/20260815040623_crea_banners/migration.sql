-- CreateTable
CREATE TABLE "banners" (
    "id" UUID NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "imagen_url" TEXT NOT NULL,
    "storage_key" VARCHAR(255),
    "enlace" VARCHAR(500),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empieza_en" TIMESTAMP(3),
    "termina_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_activo_orden_idx" ON "banners"("activo", "orden");
