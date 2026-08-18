# syntax=docker/dockerfile:1
# Build MULTI-STAGE: una etapa construye (con todo el tooling) y otra corre (mínima).
# La imagen final NO contiene la CLI de Prisma, tsx, esbuild ni nada de dev.

# ========================= Etapa 1: builder =========================
# "AS builder" le pone nombre a la etapa para referenciarla después. Aquí vive
# todo lo pesado; nada de esto llega a la imagen final salvo lo que copiemos.
FROM node:24-slim AS builder
WORKDIR /app

# Truco de caché: manifiestos primero, luego `npm ci` (TODAS las deps, incl. dev).
COPY package.json package-lock.json ./
RUN npm ci

# Código + generación del cliente de Prisma (URL de mentira: generate no conecta).
COPY . .
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

# ========================= Etapa 2: runtime =========================
# Arrancamos de una base LIMPIA. Todo lo que no copiemos explícitamente, no existe.
FROM node:24-slim AS runtime
WORKDIR /app

# `production` desactiva devDependencies y pone a librerías en modo prod.
ENV NODE_ENV=production

# Solo dependencias de PRODUCCIÓN: sin CLI de Prisma, tsx, esbuild, tooling de test.
# Ahí está el grueso del adelgazamiento. `npm cache clean` quita el caché de la capa.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Traemos del builder SOLO el código y el cliente de Prisma YA generado
# (src/generated/prisma). El schema, las migraciones y el seed no hacen falta para correr.
COPY --from=builder /app/src ./src

# Seguridad: no correr como root. La imagen de node trae un usuario `node` sin privilegios.
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]
