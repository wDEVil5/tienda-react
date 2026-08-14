import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioIdentidad } from '../src/modules/identidad/identidad.service.js'
import { IDENTIDAD_POR_DEFECTO } from '../src/lib/identidadTienda.js'

test('obtenerIdentidad cae en el default cuando la base no tiene fila', async () => {
  const servicio = crearServicioIdentidad({
    async obtener() { return null },
  })

  const identidad = await servicio.obtenerIdentidad()

  assert.equal(identidad.nombre, IDENTIDAD_POR_DEFECTO.nombre)
  assert.equal(identidad.direccion, IDENTIDAD_POR_DEFECTO.direccion)
  assert.equal(identidad.instagram, null)
  // No filtra timestamps ni id.
  assert.equal('id' in identidad, false)
  assert.equal('updatedAt' in identidad, false)
})

test('obtenerIdentidad proyecta la fila de la base a la forma pública', async () => {
  const servicio = crearServicioIdentidad({
    async obtener() {
      return {
        id: 'singleton',
        nombre: 'Mi Almacén',
        email: 'hola@mialmacen.cl',
        telefono: '+56 9 0000 0000',
        whatsapp: null,
        direccion: 'Calle 1',
        horarioAtencion: 'Lun a Vie',
        instagram: 'https://instagram.com/mialmacen',
        facebook: null,
        tiktok: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },
  })

  const identidad = await servicio.obtenerIdentidad()

  assert.equal(identidad.nombre, 'Mi Almacén')
  assert.equal(identidad.instagram, 'https://instagram.com/mialmacen')
  assert.equal('createdAt' in identidad, false)
})

test('actualizarIdentidad guarda la forma proyectada y devuelve lo vigente', async () => {
  const capturado = { guardado: null }
  const fila = {
    nombre: 'Nuevo',
    email: 'n@n.cl',
    telefono: '123',
    whatsapp: null,
    direccion: 'Dir',
    horarioAtencion: 'Horario',
    instagram: null,
    facebook: null,
    tiktok: null,
  }
  const servicio = crearServicioIdentidad({
    async guardar(datos) { capturado.guardado = datos },
    async obtener() { return fila },
  })

  const identidad = await servicio.actualizarIdentidad({ ...fila, campoExtra: 'ignorado' })

  // Solo se guardan los campos conocidos (el extra no se cuela).
  assert.equal('campoExtra' in capturado.guardado, false)
  assert.equal(capturado.guardado.nombre, 'Nuevo')
  assert.equal(identidad.nombre, 'Nuevo')
})
