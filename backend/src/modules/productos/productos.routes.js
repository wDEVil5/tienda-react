import { Router } from 'express'
import { listarProductos } from './productos.service.js'

const productosRouter = Router()

productosRouter.get('/', (_request, response) => {
  response.json({ data: listarProductos() })
})

export default productosRouter
