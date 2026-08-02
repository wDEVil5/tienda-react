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

test('subirImagenProducto acepta una imagen PNG válida', async () => {
  let seSubio = false
  const servicio = crearServicioImagenes({
    async subirImagenProducto() {
      seSubio = true
      return { url: 'https://ejemplo.test/imagen.png', storageKey: 'producto/imagen' }
    },
  })
  const buffer = await sharp({
    create: { width: 800, height: 800, channels: 3, background: '#ffffff' },
  }).png().toBuffer()

  await servicio.subirImagenProducto({ buffer })

  assert.equal(seSubio, true)
})

test('subirLogoMarca admite proporciones de logo desde 200 × 100 píxeles', async () => {
  let archivoSubido
  const servicio = crearServicioImagenes({
    async subirLogoMarca(buffer) { archivoSubido = buffer; return { url: 'https://ejemplo.test/logo.webp' } },
  }, () => ({
    async metadata() { return { format: 'webp', width: 200, height: 100 } },
  }))

  const resultado = await servicio.subirLogoMarca({ buffer: Buffer.from('logo') })

  assert.equal(resultado.url, 'https://ejemplo.test/logo.webp')
  assert.deepEqual(archivoSubido, Buffer.from('logo'))
})
