import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { crearServicioImagenes } from '../src/modules/imagenes/imagenes.service.js'

test('subirImagenProducto valida dimensiones y delega una imagen WebP', async () => {
  let bufferRecibido
  const almacenamiento = {
    async subirImagenProducto(buffer) {
      bufferRecibido = buffer
      return { url: 'https://ejemplo.test/imagen.webp', storageKey: 'producto/imagen' }
    },
  }
  const servicio = crearServicioImagenes(almacenamiento)
  const buffer = await sharp({
    create: { width: 800, height: 800, channels: 3, background: '#ffffff' },
  }).webp().toBuffer()

  const resultado = await servicio.subirImagenProducto({ buffer })

  assert.equal(bufferRecibido, buffer)
  assert.equal(resultado.storageKey, 'producto/imagen')
})

test('subirImagenProducto rechaza imágenes menores a 800 píxeles', async () => {
  const servicio = crearServicioImagenes({ async subirImagenProducto() {} })
  const buffer = await sharp({
    create: { width: 799, height: 800, channels: 3, background: '#ffffff' },
  }).jpeg().toBuffer()

  await assert.rejects(
    () => servicio.subirImagenProducto({ buffer }),
    (error) => error.code === 'IMAGE_DIMENSIONS_TOO_SMALL',
  )
})
