import { Router } from 'express'
import { listarMarcas } from './marcas.service.js'

const marcasRouter = Router()

marcasRouter.get('/', (_request, response) => {
  response.json({ data: listarMarcas() })
})

export default marcasRouter
