import { Router } from 'express'
import { listarCategorias } from './categorias.service.js'

const categoriasRouter = Router()

categoriasRouter.get('/', (_request, response) => {
  response.json({ data: listarCategorias() })
})

export default categoriasRouter
