import multer from 'multer'

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024
const MIMES_PERMITIDOS = new Set(['image/jpeg', 'image/webp'])

const receptorImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 },
  fileFilter(_request, archivo, callback) {
    if (!MIMES_PERMITIDOS.has(archivo.mimetype)) {
      const error = new Error('Solo se permiten archivos JPG o WebP.')
      error.code = 'INVALID_IMAGE_MIMETYPE'
      return callback(error)
    }
    return callback(null, true)
  },
})

// Multer procesa multipart antes del controlador. Convertimos sus errores en
// una respuesta de dominio para no exponer detalles de la biblioteca.
export function recibirImagenProducto(request, response, next) {
  receptorImagen.single('imagen')(request, response, (error) => {
    if (!error) return next()

    const esArchivoMuyGrande = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
    return response.status(422).json({
      error: {
        code: esArchivoMuyGrande ? 'IMAGE_TOO_LARGE' : 'INVALID_IMAGE_FILE',
        message: esArchivoMuyGrande
          ? 'La imagen no puede superar 5 MB.'
          : 'Solo se permiten archivos JPG o WebP.',
      },
    })
  })
}
