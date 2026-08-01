# 🛒 SumarketExpress

E-commerce SPA, creado como proyecto personal de aprendizaje full-stack. El frontend está construido con React y el backend propio evoluciona de forma gradual con Express, PostgreSQL y Prisma.

## Demo

[Ver demo pública](https://wdevil5.github.io/tienda-react/)

> La demo en GitHub Pages aún usa Fake Store como respaldo. En desarrollo local, React consume la API propia y su base de datos PostgreSQL.

![Vista previa de SumarketExpress](./src/assets/vistaprevia.png)

## Incluye

- Catálogo, búsqueda con sugerencias, filtros, orden y paginación.
- Ficha de producto, imágenes, precios y ofertas.
- Carrito persistente con cantidades, eliminación, deshacer y drawer accesible.
- Diseño responsive para escritorio, tablet y móvil.
- API REST local con productos, categorías, marcas y promociones vigentes.

## Stack

- React 19, Vite, React Router y CSS Modules.
- Vitest + React Testing Library para frontend.
- Node.js, Express 5, PostgreSQL 16 y Prisma 7 para backend.
- `node:test` + Supertest para API.

## Arquitectura

El frontend y `backend/` son aplicaciones separadas dentro del mismo repositorio. La API usa un monolito modular: rutas → servicios → repositorios → Prisma/PostgreSQL. Esto permite reemplazar Fake Store sin acoplar la interfaz a una fuente externa.

El catálogo persistido contempla categorías, marcas, productos, galerías de imágenes y promociones. Las ofertas se determinan por una campaña activa y vigente; el producto mantiene el precio final y, cuando corresponde, su precio normal tachado.

## Ejecutar localmente

```bash
git clone https://github.com/wDEVil5/tienda-react.git
cd tienda-react
npm install
npm run dev
```

Frontend: `http://localhost:5173/tienda-react/`

### API y base de datos local

Con PostgreSQL 16 en ejecución:

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

API: `http://localhost:3000`

Endpoints principales:

```text
GET /api/health
GET /api/productos?q=cafe&categoria=despensa&ofertas=true&page=1&limit=12
GET /api/productos/:slug
GET /api/categorias
GET /api/marcas
```

## Calidad

```bash
# Frontend
npm test

# Backend
cd backend && npm test
```

## Roadmap

1. Consolidar catálogo, promociones y futuras reglas de administración.
2. Autenticación, pedidos y checkout.
3. Panel administrativo, pagos reales y despliegue de API/BD.
4. App móvil con React Native + Expo.

El alcance y las decisiones del producto se mantienen en el PRD de Notion.

---

Desarrollado por [Wilnes](https://github.com/wDEVil5).
