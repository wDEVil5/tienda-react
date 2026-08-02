import test from 'node:test'
import assert from 'node:assert/strict'
import { crearClienteCloudinary } from '../src/lib/cloudinary.js'

test('configura Cloudinary con credenciales exclusivas del backend', () => {
  let configuracionRecibida
  const sdk = { config(configuracion) { configuracionRecibida = configuracion } }

  const cliente = crearClienteCloudinary({
    CLOUDINARY_CLOUD_NAME: 'sumarket-demo',
    CLOUDINARY_API_KEY: 'clave-publica',
    CLOUDINARY_API_SECRET: 'secreto-local',
  }, sdk)

  assert.equal(cliente, sdk)
  assert.deepEqual(configuracionRecibida, {
    cloud_name: 'sumarket-demo',
    api_key: 'clave-publica',
    api_secret: 'secreto-local',
    secure: true,
  })
})

test('falla temprano si falta una credencial de Cloudinary', () => {
  assert.throws(
    () => crearClienteCloudinary({ CLOUDINARY_CLOUD_NAME: 'sumarket-demo' }, { config() {} }),
    /CLOUDINARY_API_KEY es obligatoria/,
  )
})
