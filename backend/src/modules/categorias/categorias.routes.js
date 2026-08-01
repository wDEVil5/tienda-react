import { Router } from 'express'
import { listarCategorias } from './categorias.service.js'

const categoriasRouter = Router()

categoriasRouter.get('/', async (_request, response, next) => {
  try {
    return response.json({ data: await listarCategorias() })
  } catch (error) {
    return next(error)
  }
})

export default categoriasRouter
