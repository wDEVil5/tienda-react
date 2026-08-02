# 🛒 SumarketExpress

E-commerce de minimarket desarrollado como proyecto personal de aprendizaje
full-stack. La tienda pública está hecha con React y consume una API propia que
evoluciona con Express, PostgreSQL y Prisma.

## Demo

[Ver demo pública](https://wdevil5.github.io/tienda-react/)

> GitHub Pages solo aloja el frontend estático, por lo que la demo conserva
> Fake Store como respaldo. En desarrollo local, React consume la API propia y
> PostgreSQL.

![Vista previa de SumarketExpress](./src/assets/vistaprevia.png)

## Tecnologías

### Frontend

- React 19, React Router y Vite.
- JavaScript moderno, hooks, Context API y `useReducer`.
- CSS Modules y design tokens CSS para el sistema visual responsive.
- Font Awesome para iconografía.
- Vitest + React Testing Library.
- GitHub Pages + `gh-pages` para la demo pública.

### Backend y datos

- Node.js, Express 5 y API REST.
- PostgreSQL 16, Prisma 7 y migraciones versionadas.
- Zod para contratos y validación de entradas.
- Argon2id, cookies `httpOnly` y sesiones con token hasheado para el personal.
- Cloudinary, Multer y Sharp para imágenes de productos y logos de marcas.
- `node:test` + Supertest para reglas y contratos HTTP.

### Servicios temporales

- [Fake Store API](https://fakestoreapi.com/) solo como fallback de la demo
  pública mientras la API propia no esté desplegada.

## Funcionalidades actuales

### Tienda pública

- Catálogo con búsqueda, sugerencias, filtros, orden, rango de precio y
  paginación.
- Ficha de producto con galería, stock, precios, ofertas y productos
  relacionados.
- Banda de ofertas derivada de promociones vigentes, no de texto fijo.
- Carrito persistente en `localStorage`: cantidades, límite por stock,
  eliminación, deshacer, vaciado y drawer accesible.
- Checkout de invitado con contacto, retiro o despacho y cotización en vivo.
- Diseño responsive para escritorio, tablet y móvil; foco visible, navegación
  por teclado y animaciones moderadas.

### API propia

- Productos publicados con búsqueda sin tildes, categorías, marcas, imágenes,
  etiquetas, promociones vigentes, filtros y paginación.
- Administración protegida de productos, categorías, marcas, logos, etiquetas,
  promociones y operadores.
- Sesiones de administrador/operador, roles y limitador de intentos de login.
- Pedidos con montos recalculados por el servidor, snapshots históricos,
  reserva atómica de stock y máquina de estados por modalidad de entrega.
- Reglas de entrega calculadas en el backend: envío gratis, tarifa base y
  cobertura reducida por comuna. Más adelante serán configurables desde el
  panel sobre un catálogo geográfico base.

## Arquitectura

El frontend y `backend/` son aplicaciones separadas dentro del mismo
repositorio. La API sigue un monolito modular:

```text
routes → services → repositories → Prisma → PostgreSQL
```

La UI se comunica mediante HTTP y normaliza sus respuestas; así Fake Store
puede retirarse sin acoplar la interfaz a su estructura. En pedidos, el cliente
solo envía productos, cantidades y entrega: precio, descuento, envío y stock
los determina el servidor.

## Ejecutar localmente

### 1. Frontend

```bash
git clone https://github.com/wDEVil5/tienda-react.git
cd tienda-react
npm install
npm run dev
```

Frontend: `http://localhost:5173/tienda-react/`

### 2. API y base de datos

Con PostgreSQL 16 iniciado, abre otra terminal:

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

API: `http://localhost:3000`

Endpoints públicos principales:

```text
GET  /api/health
GET  /api/productos?q=cafe&categoria=despensa&ofertas=true&page=1&limit=12
GET  /api/productos/:slug
GET  /api/categorias
GET  /api/marcas
POST /api/pedidos/cotizar
POST /api/pedidos
```

## Calidad

```bash
# Frontend
npm test
npm run lint
npm run build

# Backend
cd backend && npm test
```

Actualmente hay pruebas unitarias y de integración para carrito, servicios del
frontend, catálogo, autenticación, administración, imágenes, promociones,
pedidos, stock y transiciones de estado.

## Próximos pasos

1. Integrar Mercado Pago/stripe y verificar pagos mediante webhook.
2. Expirar pedidos pendientes para liberar reservas de stock abandonadas.
3. Construir la interfaz del panel administrativo sobre la API ya creada.
4. Configurar cobertura, tarifas y plazos de entrega desde administración.
5. Desplegar API, PostgreSQL y almacenamiento de imágenes; retirar Fake Store.

El alcance y las decisiones de producto se mantienen en el PRD.

---

Desarrollado por [Wilnes](https://github.com/wDEVil5).
