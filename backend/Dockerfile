# syntax=docker/dockerfile:1
# Receta para construir la imagen de la API. Cada instrucción = una CAPA cacheada.

# --- Imagen base ---
# Partimos de una imagen oficial de Node 24 (variante "slim": Debian mínimo, más
# liviana que la completa y sin los dolores de cabeza de Prisma en Alpine).
FROM node:24-slim

# Carpeta de trabajo dentro del contenedor. Las rutas relativas cuelgan de aquí.
WORKDIR /app

# --- TRUCO DE CACHÉ (lo más importante del archivo) ---
# Copiamos SOLO los manifiestos primero. Como Docker cachea por capa, mientras
# package.json/lock no cambien, la capa de `npm ci` se reutiliza tal cual —aunque
# edites tu código—. Instalar dependencias es lo más lento; así casi nunca se repite.
COPY package.json package-lock.json ./

# `npm ci` = instalación limpia y reproducible desde el lockfile (no "resuelve"
# versiones como `npm install`). Incluye devDependencies porque necesitamos la
# CLI de Prisma para el paso siguiente.
RUN npm ci

# AHORA sí el resto del código. Cambiar código invalida esta capa y las de abajo,
# pero NO la de `npm ci` de arriba. Por eso el orden manifiestos → código importa.
COPY . .

# Genera el cliente de Prisma (a src/generated/prisma, que está gitignored y
# .dockerignored, por eso hay que generarlo dentro de la imagen).
#
# `prisma.config.ts` exige DATABASE_URL al cargarse, pero `generate` NO se conecta
# a la base: solo lee el schema. Le damos una URL DE MENTIRA, inline en este RUN
# (no persiste como variable de la imagen), para satisfacer la config sin secretos.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

# Documenta que el server escucha el 3000. Es informativo: NO publica el puerto
# (eso se hace al correr, con -p o en compose).
EXPOSE 3000

# Comando por defecto (exec-form: sin shell intermedia). SIN --env-file: en un
# contenedor las variables entran por el ENTORNO (compose / -e), nunca desde un
# .env horneado en la imagen (sería meter secretos en algo que se comparte).
CMD ["node", "src/server.js"]
