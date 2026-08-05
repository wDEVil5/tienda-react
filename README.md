# 🛒 SumarketExpress

E-commerce de minimarket desarrollado como proyecto personal de aprendizaje
full-stack. La tienda pública está hecha con React y consume una API propia que
evoluciona con Express, PostgreSQL y Prisma.

## Demo

[Ver demo pública](https://wdevil5.github.io/tienda-react/)

> La demo en vivo consume la **API propia desplegada** (Render + PostgreSQL en
> Supabase). Si esa API gratuita está dormida y la primera petición se pasa de
> tiempo, el catálogo cae automáticamente a Fake Store como respaldo; recargar
> lo soluciona.

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
- Servicio de correo con transporte inyectable (memoria/consola/proveedor real).
- Mercado Pago Checkout Pro en modo prueba, con webhook verificado por servidor.
- `node:test` + Supertest para reglas y contratos HTTP.

### Servicios temporales

- [Fake Store API](https://fakestoreapi.com/) como respaldo automático de la
  demo si la API propia (plan gratuito) está temporalmente dormida.

## Funcionalidades actuales

### Tienda pública

- Catálogo con búsqueda, sugerencias, filtros, orden, rango de precio y
  paginación.
- Ficha de producto con galería, stock, precios, ofertas y productos
  relacionados.
- Banda de ofertas derivada de promociones vigentes, no de texto fijo.
- Carrito persistente en `localStorage`: cantidades, límite por stock,
  eliminación, deshacer, vaciado y drawer accesible.
- Checkout en dos pasos con contacto, retiro o despacho, cotización en vivo y
  pago iniciado desde el servidor.
- Login, registro, perfil, direcciones, historial y detalle de pedidos para
  clientes.
- Diseño responsive para escritorio, tablet y móvil; foco visible, navegación
  por teclado y animaciones moderadas.

### Panel de administración (staff)

- **Resumen**: tablero con KPIs por período y su variación (ventas de pagos
  aprobados, pedidos, ticket promedio, stock crítico), gráfico de ventas por día,
  ranking de más vendidos, pipeline de pedidos por estado, cobros e ingresos por
  modalidad. Trae acciones inline sobre los pedidos que requieren atención, panel
  de productos por reponer, selector de período y refresco en vivo; gráficos y
  donuts hechos con SVG, sin librerías de terceros.
- **Pedidos**: listado con búsqueda por número o cliente y conteos por estado,
  detalle, avance de estado, impresión de comanda y exportación a CSV.
- **Productos**: alta, edición, archivado/restauración y eliminación definitiva
  (solo sin ventas; con pedidos asociados se archiva), con imágenes, categorías,
  marcas, etiquetas y promociones.
- **Mi cuenta**: editar el nombre, cambiar la contraseña, cerrar sesión y cerrar
  la sesión en todos los dispositivos.
- **Equipo** (solo administrador): crear operadores y activarlos, desactivarlos,
  restablecer su contraseña o eliminarlos; gestionar una cuenta revoca sus
  sesiones.
- Navegación lateral con iconos, acceso directo a la tienda pública, login en su
  propia ruta y control por rol (`ADMIN` / `OPERADOR`).

### API propia

- Productos publicados con búsqueda sin tildes, categorías, marcas, imágenes,
  etiquetas, promociones vigentes, filtros y paginación.
- Disponibilidad honesta por producto (`disponible` = stock − reservado,
  `estadoStock`) y suscripción "Avísame" para productos agotados.
- Administración protegida de productos, categorías, marcas, logos, etiquetas,
  promociones y operadores.
- Sesiones de administrador/operador, roles y limitador de intentos de login.
- Cuentas de clientes como dominio separado del staff: registro, login y logout
  con cookie de sesión propia, direcciones guardadas e historial de pedidos.
- Pedidos con montos recalculados por el servidor, snapshots históricos,
  reserva atómica de stock y máquina de estados por modalidad de entrega.
- Reglas de entrega editables por el administrador (umbral de envío gratis,
  tarifa base, tarifas por comuna y corte de retiro), persistidas en la base;
  el servidor calcula el costo de envío.
- Notificaciones por correo con transporte inyectable: aviso de reposición al
  reponer stock y confirmación al crear un pedido.
- Pagos de prueba con Mercado Pago: preferencia, webhook idempotente y avance
  transaccional de stock/pedido tras la aprobación.

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

## Despliegue en producción

La aplicación está desplegada de forma gratuita (portafolio):

| Capa | Servicio | URL |
|---|---|---|
| Frontend | GitHub Pages | https://wdevil5.github.io/tienda-react/ |
| API | Render | https://sumarket-express-api.onrender.com/api |
| Base de datos | Supabase (PostgreSQL) | — |
| Pagos | Mercado Pago (pruebas) | — |

El frontend se publica con `npm run deploy` (build + `gh-pages`). La API corre en
Render y aplica las migraciones durante el build. Como el plan gratuito de Render
suspende el servicio tras unos minutos de inactividad, la primera visita puede
tardar unos segundos en responder mientras despierta.

> **Limitación conocida — sesión en Safari (y navegadores con cookies de
> terceros bloqueadas).** En este despliegue el frontend (`github.io`) y la API
> (`onrender.com`) son **sitios distintos**, así que la cookie de sesión viaja
> *cross-site* (`SameSite=None; Secure`). Chrome aún la acepta, pero Safari la
> bloquea por defecto (*Evitar el rastreo entre sitios*): el login responde 200
> pero el navegador descarta la cookie y la siguiente petición da 401. Afecta a la
> sesión del panel y a las cuentas de clientes. Se resuelve sirviendo front y API
> desde el **mismo origen** (o un dominio propio con subdominio para la API), o
> migrando la auth del panel a *token* en cabecera. En local no ocurre:
> `localhost:5173` y `localhost:3000` son el mismo sitio.

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
GET  /api/reglas
POST /api/pedidos/cotizar
POST /api/pedidos
POST /api/pagos
GET  /api/pagos/:pagoId
POST /api/avisos
```

Las cuentas de clientes viven bajo `/api/cuenta` (registro, login, logout,
direcciones e historial de pedidos) con su propia cookie de sesión.

## Calidad

```bash
# Frontend
npm test
npm run lint
npm run build

# Backend
cd backend && npm test
```

Actualmente hay 69 pruebas de frontend y 388 de backend para carrito, catálogo,
autenticación, administración, imágenes, promociones, pedidos, stock,
transiciones, cuentas de clientes, avisos, correo y pagos.

## Próximos pasos

1. Resolver y verificar el retorno de Mercado Pago hacia la confirmación de la
   tienda en el entorno público HTTPS; el webhook ya es la fuente de verdad.
2. Completar las secciones del panel aún pendientes (Inventario, Clientes,
   Identidad y Contenido) sobre los endpoints ya existentes.
3. Conectar un proveedor de correo real (hoy corre con transporte de consola) y
   verificar la firma del webhook de Mercado Pago (`x-signature`).
4. App móvil con React Native/Expo (fase posterior del roadmap).

El alcance y las decisiones de producto se mantienen en un PRD.

---

Desarrollado por [Wilnes](https://github.com/wDEVil5).
