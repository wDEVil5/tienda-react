import { Router } from 'express'
import { reglasPublicas } from '../../lib/reglasTienda.js'

const reglasRouter = Router()

// Reglas comerciales públicas: umbral de envío gratis, tarifa base, tarifas por
// comuna y corte de retiro. Fuente única en lib/reglasTienda.js; el frontend las
// lee para la barra "faltan $X para envío gratis" sin escribir el umbral a mano.
// Son constantes puras (no tocan la base), por eso la ruta es síncrona.
reglasRouter.get('/', (_request, response) => {
  response.json({ data: reglasPublicas() })
})

export default reglasRouter
