-- CreateTable
CREATE TABLE "configuracion_tienda" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'singleton',
    "envio_gratis_desde" INTEGER NOT NULL,
    "tarifa_base" INTEGER NOT NULL,
    "corte_retiro_hoy" VARCHAR(5) NOT NULL,
    "preparacion_horas" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_tienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifas_comuna" (
    "id" UUID NOT NULL,
    "comuna" VARCHAR(80) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "tarifa" INTEGER NOT NULL,
    "plazo_horas" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarifas_comuna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarifas_comuna_comuna_key" ON "tarifas_comuna"("comuna");
