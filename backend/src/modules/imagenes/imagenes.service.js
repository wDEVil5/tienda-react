import sharp from 'sharp'
import { almacenamientoImagenes } from './imagenes.storage.js'

const FORMATOS_PERMITIDOS = new Set(['jpeg', 'png', 'webp'])
const LADO_MINIMO = 800

export class ErrorImagen extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function crearServicioImagenes(
  almacenamiento = almacenamientoImagenes,
  procesadorImagen = sharp,
) {
  return {
    async subirImagenProducto(archivo) {
      if (!archivo?.buffer) {
        throw new ErrorImagen('IMAGE_REQUIRED', 'Debes adjuntar una imagen.')
      }

      let metadata
      try {
        metadata = await procesadorImagen(archivo.buffer).metadata()
      } catch {
        throw new ErrorImagen('INVALID_IMAGE_FILE', 'El archivo no es una imagen válida.')
      }

      if (!FORMATOS_PERMITIDOS.has(metadata.format)) {
        throw new ErrorImagen('INVALID_IMAGE_FORMAT', 'Solo se permiten imágenes JPG, PNG o WebP.')
      }

      if (metadata.width < LADO_MINIMO || metadata.height < LADO_MINIMO) {
        throw new ErrorImagen(
          'IMAGE_DIMENSIONS_TOO_SMALL',
          'La imagen debe medir al menos 800 × 800 píxeles.',
        )
      }

      return almacenamiento.subirImagenProducto(archivo.buffer)
    },
  }
}

const servicioImagenes = crearServicioImagenes()

export const subirImagenProducto = servicioImagenes.subirImagenProducto
