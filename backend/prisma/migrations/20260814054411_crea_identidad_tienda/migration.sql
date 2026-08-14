-- CreateTable
CREATE TABLE "identidad_tienda" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'singleton',
    "nombre" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(40) NOT NULL,
    "whatsapp" VARCHAR(40),
    "direccion" VARCHAR(200) NOT NULL,
    "horario_atencion" VARCHAR(120) NOT NULL,
    "instagram" VARCHAR(255),
    "facebook" VARCHAR(255),
    "tiktok" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identidad_tienda_pkey" PRIMARY KEY ("id")
);
