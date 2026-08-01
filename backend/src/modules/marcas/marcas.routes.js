import { Router } from 'express'
import { listarMarcas } from './marcas.service.js'

const marcasRouter = Router()

marcasRouter.get('/', async (_request, response, next) => {
  try {
    return response.json({ data: await listarMarcas() })
  } catch (error) {
    return next(error)
  }
})

export default marcasRouter
