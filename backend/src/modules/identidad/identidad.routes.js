import { Router } from 'express'
import { obtenerIdentidad } from './identidad.service.js'

const identidadRouter = Router()

// Identidad pública de la tienda (nombre, contacto, dirección, horario, redes).
// Se lee de la base (editable por el dueño); si no hay fila aún, el servicio cae
// en los valores por defecto. El frontend la usa en el footer y la marca.
identidadRouter.get('/', async (_request, response, next) => {
  try {
    return response.json({ data: await obtenerIdentidad() })
  } catch (error) {
    return next(error)
  }
})

export default identidadRouter
