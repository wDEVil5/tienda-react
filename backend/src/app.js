import express from 'express'

// La aplicación se exporta separada del servidor para probar rutas sin abrir un puerto.
const app = express()

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

export default app
