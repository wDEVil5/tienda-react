import test from 'node:test'
import assert from 'node:assert/strict'
import { crearAlmacenamientoImagenes } from '../src/modules/imagenes/imagenes.storage.js'

test('subirImagenProducto adapta la respuesta de Cloudinary al contrato interno', async () => {
  let opcionesRecibidas
  let bufferRecibido
  const cliente = {
    uploader: {
      upload_stream(opciones, callback) {
        opcionesRecibidas = opciones
        return {
          end(buffer) {
            bufferRecibido = buffer
            callback(null, {
              secure_url: 'https://res.cloudinary.com/demo/image/upload/aceite.webp',
              public_id: 'sumarket/productos/aceite',
              width: 800,
              height: 800,
              format: 'webp',
            })
          },
        }
      },
    },
  }
  const almacenamiento = crearAlmacenamientoImagenes(() => cliente)
  const buffer = Buffer.from('imagen')

  const resultado = await almacenamiento.subirImagenProducto(buffer)

  assert.equal(bufferRecibido, buffer)
  assert.deepEqual(opcionesRecibidas, {
    folder: 'sumarket/productos',
    resource_type: 'image',
    overwrite: false,
  })
  assert.deepEqual(resultado, {
    url: 'https://res.cloudinary.com/demo/image/upload/aceite.webp',
    storageKey: 'sumarket/productos/aceite',
    ancho: 800,
    alto: 800,
    formato: 'webp',
  })
})
