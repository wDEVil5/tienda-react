import express from 'express'
import productosRouter from './modules/productos/productos.routes.js'

// La aplicación se exporta separada del servidor para probar rutas sin abrir un puerto.
const app = express()

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
