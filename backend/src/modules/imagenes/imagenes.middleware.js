import multer from 'multer'

const MIMES_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])

function crearReceptorImagen(tamanoMaximoBytes) {
  return multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: tamanoMaximoBytes, files: 1 },
  fileFilter(_request, archivo, callback) {
    if (!MIMES_PERMITIDOS.has(archivo.mimetype)) {
      const error = new Error('Solo se permiten archivos JPG, PNG o WebP.')
      error.code = 'INVALID_IMAGE_MIMETYPE'
      return callback(error)
    }
    return callback(null, true)
  },
  })
}

const receptorImagenProducto = crearReceptorImagen(5 * 1024 * 1024)
const receptorLogoMarca = crearReceptorImagen(2 * 1024 * 1024)
const receptorImagenBanner = crearReceptorImagen(5 * 1024 * 1024)

// Multer procesa multipart antes del controlador. Convertimos sus errores en
// una respuesta de dominio para no exponer detalles de la biblioteca.
function recibirArchivo(receptor, request, response, next, tamanoMaximoMB) {
  receptor.single('imagen')(request, response, (error) => {
    if (!error) return next()

    const esArchivoMuyGrande = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
    return response.status(422).json({
      error: {
        code: esArchivoMuyGrande ? 'IMAGE_TOO_LARGE' : 'INVALID_IMAGE_FILE',
        message: esArchivoMuyGrande
          ? `La imagen no puede superar ${tamanoMaximoMB} MB.`
          : 'Solo se permiten archivos JPG, PNG o WebP.',
      },
    })
  })
}

export function recibirImagenProducto(request, response, next) {
  return recibirArchivo(receptorImagenProducto, request, response, next, 5)
}

export function recibirLogoMarca(request, response, next) {
  return recibirArchivo(receptorLogoMarca, request, response, next, 2)
}

export function recibirImagenBanner(request, response, next) {
  return recibirArchivo(receptorImagenBanner, request, response, next, 5)
}
