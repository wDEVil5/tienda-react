import { obtenerClienteCloudinary } from '../../lib/cloudinary.js'

export function crearAlmacenamientoImagenes(obtenerCliente = obtenerClienteCloudinary) {
  return {
    subirImagenProducto(buffer) {
      const cliente = obtenerCliente()

      return new Promise((resolve, reject) => {
        const carga = cliente.uploader.upload_stream(
          {
            folder: 'sumarket/productos',
            resource_type: 'image',
            overwrite: false,
          },
          (error, resultado) => {
            if (error) return reject(error)

            return resolve({
              url: resultado.secure_url,
              storageKey: resultado.public_id,
              ancho: resultado.width,
              alto: resultado.height,
              formato: resultado.format,
            })
          },
        )
        carga.end(buffer)
      })
    },

    subirLogoMarca(buffer) {
      const cliente = obtenerCliente()

      return new Promise((resolve, reject) => {
        const carga = cliente.uploader.upload_stream(
          {
            folder: 'sumarket/marcas',
            resource_type: 'image',
            overwrite: false,
          },
          (error, resultado) => {
            if (error) return reject(error)
            return resolve({
              url: resultado.secure_url,
              storageKey: resultado.public_id,
              ancho: resultado.width,
              alto: resultado.height,
              formato: resultado.format,
            })
          },
        )
        carga.end(buffer)
      })
    },

    subirImagenBanner(buffer) {
      const cliente = obtenerCliente()

      return new Promise((resolve, reject) => {
        const carga = cliente.uploader.upload_stream(
          {
            folder: 'sumarket/banners',
            resource_type: 'image',
            overwrite: false,
          },
          (error, resultado) => {
            if (error) return reject(error)
            return resolve({
              url: resultado.secure_url,
              storageKey: resultado.public_id,
              ancho: resultado.width,
              alto: resultado.height,
              formato: resultado.format,
            })
          },
        )
        carga.end(buffer)
      })
    },

    async eliminarImagenBanner(storageKey) {
      const cliente = obtenerCliente()
      const resultado = await cliente.uploader.destroy(storageKey, {
        resource_type: 'image',
        invalidate: true,
      })
      return resultado.result
    },

    async eliminarImagenProducto(storageKey) {
      const cliente = obtenerCliente()
      const resultado = await cliente.uploader.destroy(storageKey, {
        resource_type: 'image',
        invalidate: true,
      })

      return resultado.result
    },

    async eliminarLogoMarca(storageKey) {
      const cliente = obtenerCliente()
      const resultado = await cliente.uploader.destroy(storageKey, {
        resource_type: 'image',
        invalidate: true,
      })

      return resultado.result
    },
  }
}

export const almacenamientoImagenes = crearAlmacenamientoImagenes()
export const eliminarLogoMarca = almacenamientoImagenes.eliminarLogoMarca
export const eliminarImagenBanner = almacenamientoImagenes.eliminarImagenBanner
