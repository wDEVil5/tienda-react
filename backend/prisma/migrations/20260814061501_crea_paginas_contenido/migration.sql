-- CreateTable
CREATE TABLE "paginas_contenido" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paginas_contenido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paginas_contenido_slug_key" ON "paginas_contenido"("slug");
