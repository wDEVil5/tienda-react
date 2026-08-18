# syntax=docker/dockerfile:1
# Imagen del FRONTEND. Un front no "corre" como la API: se COMPILA a archivos
# estáticos y un servidor web (nginx) los entrega. De ahí el multi-stage:
# Node solo aparece en la etapa de build; la imagen final es nginx + tus estáticos.

# ===================== Etapa 1: build =====================
FROM node:24-slim AS build
WORKDIR /app

# Truco de caché de siempre: manifiestos → npm ci → código.
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Las VITE_* se HORNEAN en el bundle en tiempo de BUILD (no en runtime): quedan
# escritas dentro del JavaScript que descarga el navegador. Por eso se pasan como
# build ARG. Cambiar la URL de la API = reconstruir la imagen (no es un env de runtime).
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_BRANDFETCH_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_BRANDFETCH_CLIENT_ID=$VITE_BRANDFETCH_CLIENT_ID

RUN npm run build   # produce /app/dist

# ===================== Etapa 2: runtime =====================
# Imagen final: solo nginx (alpine, ~50 MB) + los estáticos. Cero Node.
FROM nginx:1.27-alpine AS runtime

# Nuestra config con el fallback SPA reemplaza la de por defecto.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos SOLO el resultado del build desde la etapa anterior.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# La imagen de nginx ya arranca en foreground por defecto; no hace falta CMD.
