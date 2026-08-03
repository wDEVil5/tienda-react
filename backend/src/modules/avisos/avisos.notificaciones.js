import { repositorioAvisos } from './avisos.repository.js'
import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'

// URL pública de la tienda para armar el enlace al producto. Reutiliza la misma
// variable que CORS: el frontend vive en ese origen.
const URL_TIENDA = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

// Plantilla del correo de reposición. Pura: el contenido se prueba sin enviar
// nada. La ruta /producto/:slug es la ficha en el frontend.
export function plantillaReposicion({ nombre, slug, urlBase = URL_TIENDA }) {
  const url = `${urlBase}/producto/${slug}`
  return {
    asunto: `Volvió el stock: ${nombre}`,
    texto: `¡Buenas noticias! ${nombre} volvió a estar disponible. Cómpralo aquí: ${url}`,
    html: `<p>¡Buenas noticias! <strong>${nombre}</strong> volvió a estar disponible.</p><p><a href="${url}">Ir al producto</a></p>`,
  }
}

// Barre los avisos listos, envía el correo de reposición y marca como
// notificados SOLO los que se enviaron con éxito. Los que fallan quedan
// pendientes para el próximo barrido (reintento sin duplicar).
export function crearProcesadorAvisos({
  repositorio = repositorioAvisos,
  servicioCorreo = servicioCorreoPorDefecto,
  urlBase = URL_TIENDA,
} = {}) {
  return {
    async procesarReposiciones({ limite = 50 } = {}) {
      const pendientes = await repositorio.listarListosParaNotificar(limite)
      const notificados = []
      let fallidos = 0

      for (const aviso of pendientes) {
        const mensaje = plantillaReposicion({
          nombre: aviso.producto.nombre,
          slug: aviso.producto.slug,
          urlBase,
        })
        try {
          await servicioCorreo.enviar({ para: aviso.email, ...mensaje })
          notificados.push(aviso.id)
        } catch (error) {
          fallidos += 1
          console.error(`No se pudo enviar el aviso ${aviso.id}: ${error.message}`)
        }
      }

      await repositorio.marcarNotificados(notificados)

      return { revisados: pendientes.length, notificados: notificados.length, fallidos }
    },
  }
}

export const procesadorAvisos = crearProcesadorAvisos()
