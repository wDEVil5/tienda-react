-- El dominio oficial identifica la marca en Brandfetch. Guardamos el
-- identificador, no una copia del logo: el frontend construye la URL CDN.
ALTER TABLE "marcas" ADD COLUMN "brandfetch_domain" VARCHAR(253);
