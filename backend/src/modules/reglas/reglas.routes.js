import { Router } from 'express'
import { obtenerReglas } from './reglas.service.js'

const reglasRouter = Router()

// Reglas comerciales públicas (umbral de envío gratis, tarifa base, tarifas por
// comuna, corte de retiro). Ahora se leen de la base (editable por el dueño);
// si no hay configuración aún, el servicio cae en los valores por defecto. El
// frontend las usa para la barra "faltan $X para envío gratis".
reglasRouter.get('/', async (_request, response, next) => {
  try {
    return response.json({ data: await obtenerReglas() })
  } catch (error) {
    return next(error)
  }
})

export default reglasRouter
