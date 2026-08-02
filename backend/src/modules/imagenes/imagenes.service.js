import sharp from 'sharp'
import { almacenamientoImagenes } from './imagenes.storage.js'

const FORMATOS_PERMITIDOS = new Set(['jpeg', 'png', 'webp'])
const LADO_MINIMO = 800
const ANCHO_MINIMO_LOGO = 200
const ALTO_MINIMO_LOGO = 100

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
    async subirLogoMarca(archivo) {
      const metadata = await leerMetadataImagen(archivo, procesadorImagen)
      if (metadata.width < ANCHO_MINIMO_LOGO || metadata.height < ALTO_MINIMO_LOGO) {
        throw new ErrorImagen(
          'LOGO_DIMENSIONS_TOO_SMALL',
          'El logo debe medir al menos 200 × 100 píxeles.',
        )
      }
      return almacenamiento.subirLogoMarca(archivo.buffer)
    },

    async subirImagenProducto(archivo) {
      const metadata = await leerMetadataImagen(archivo, procesadorImagen)

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

async function leerMetadataImagen(archivo, procesadorImagen) {
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
  return metadata
}

const servicioImagenes = crearServicioImagenes()

export const subirImagenProducto = servicioImagenes.subirImagenProducto
export const subirLogoMarca = servicioImagenes.subirLogoMarca
