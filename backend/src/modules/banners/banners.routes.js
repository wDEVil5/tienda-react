import { Router } from 'express'
import { listarBannersPublicos } from './banners.service.js'

const bannersRouter = Router()

// Banners vigentes para el carrusel del home (activos + dentro de vigencia,
// ordenados). Solo expone lo necesario para pintarlos: id, título, imagen, enlace.
bannersRouter.get('/', async (_request, response, next) => {
  try {
    return response.json({ data: await listarBannersPublicos() })
  } catch (error) {
    return next(error)
  }
})

export default bannersRouter
