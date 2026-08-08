import { repositorioAvisos } from './avisos.repository.js'
import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'
import { plantillaBaseHTML, botonHTML } from '../correo/correo.html.js'

// URL pública de la tienda para armar el enlace al producto. Reutiliza la misma
// variable que CORS: el frontend vive en ese origen.
const URL_TIENDA = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

// Plantilla del correo de reposición. Pura: el contenido se prueba sin enviar
// nada. La ruta /producto/:slug es la ficha en el frontend.
export function plantillaReposicion({ nombre, slug, urlBase = URL_TIENDA }) {
  const url = `${urlBase}/producto/${slug}`
  const contenido = `
    <h2>¡Volvió el stock! 📦</h2>
    <p class="muted">Buenas noticias: el producto que estabas esperando volvió a estar disponible.</p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0 20px;">
      <tr>
        <td style="padding:22px 24px;border:1px solid #e3e0d7;border-radius:12px;background-color:#f4f2ec;text-align:center;">
          <div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#9a978d;margin-bottom:6px;">De nuevo en tienda</div>
          <div style="font-size:19px;font-weight:700;color:#1c1b18;">${nombre}</div>
        </td>
      </tr>
    </table>

    ${botonHTML({ href: url, texto: 'Comprar ahora' })}

    <p class="muted" style="margin-top:22px;text-align:center;">El stock puede agotarse rápido. ¡No te quedes sin el tuyo!</p>
  `

  const html = plantillaBaseHTML({
    titulo: `Volvió el stock: ${nombre}`,
    preheader: `¡Buenas noticias! ${nombre} volvió a estar disponible.`,
    contenido
  })

  return {
    asunto: `Volvió el stock: ${nombre}`,
    texto: `¡Buenas noticias! ${nombre} volvió a estar disponible. Cómpralo aquí: ${url}`,
    html,
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
    async procesarReposiciones({ limite = 50, productoId = null } = {}) {
      const pendientes = await repositorio.listarListosParaNotificar(limite, productoId)
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
