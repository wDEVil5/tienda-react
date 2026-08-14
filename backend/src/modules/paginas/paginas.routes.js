import { Router } from 'express'
import { obtenerPaginaPublica } from './paginas.service.js'

const paginasRouter = Router()

// Página de contenido pública por slug (nosotros, términos, privacidad, faq).
// 404 si el slug no es válido, no existe o está despublicada. El front la
// renderiza como Markdown saneado.
paginasRouter.get('/:slug', async (request, response, next) => {
  try {
    const pagina = await obtenerPaginaPublica(request.params.slug)
    if (!pagina) {
      return response.status(404).json({
        error: { code: 'PAGE_NOT_FOUND', message: 'No encontramos esa página.' },
      })
    }
    return response.json({ data: pagina })
  } catch (error) {
    return next(error)
  }
})

export default paginasRouter
