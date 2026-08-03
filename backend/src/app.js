import cors from 'cors'
import express from 'express'
import categoriasRouter from './modules/categorias/categorias.routes.js'
import marcasRouter from './modules/marcas/marcas.routes.js'
import productosRouter from './modules/productos/productos.routes.js'
import pedidosRouter from './modules/pedidos/pedidos.routes.js'
import reglasRouter from './modules/reglas/reglas.routes.js'
import authRouter from './modules/auth/auth.routes.js'
import cuentaRouter from './modules/cuenta/cuenta.routes.js'
import direccionesRouter from './modules/cuenta/cuenta.direcciones.routes.js'
import pedidosClienteRouter from './modules/cuenta/cuenta.pedidos.routes.js'
import adminRouter from './modules/admin/admin.routes.js'

// La aplicación se exporta separada del servidor para probar rutas sin abrir un puerto.
const app = express()
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

// Solo el frontend configurado puede leer respuestas de la API desde el navegador.
app.use(cors({ origin: frontendOrigin, credentials: true }))
app.use(express.json({ limit: '20kb' }))

// Cada respuesta incluye un identificador para poder rastrear una petición en logs futuros.
app.use((_request, response, next) => {
  const requestId = crypto.randomUUID()

  response.locals.requestId = requestId
  response.setHeader('X-Request-Id', requestId)
  next()
})

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.use('/api/productos', productosRouter)
app.use('/api/categorias', categoriasRouter)
app.use('/api/marcas', marcasRouter)
app.use('/api/pedidos', pedidosRouter)
app.use('/api/reglas', reglasRouter)
app.use('/api/auth', authRouter)
app.use('/api/cuenta', cuentaRouter)
app.use('/api/cuenta/direcciones', direccionesRouter)
app.use('/api/cuenta/pedidos', pedidosClienteRouter)
app.use('/api/admin', adminRouter)

// Debe ir después de las rutas: responde de forma predecible cuando la API no reconoce una URL.
app.use((request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No existe ${request.method} ${request.originalUrl}`,
    },
  })
})

// Punto único para errores inesperados; nunca se envían detalles internos al cliente.
/** @type {import('express').ErrorRequestHandler} */
const handleUnexpectedError = (error, _request, response, next) => {
  if (response.headersSent) {
    return next(error)
  }

  //error inesperado del servidor 
  console.error(error)
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado.',
    },
  })
}

app.use(handleUnexpectedError)

export default app
