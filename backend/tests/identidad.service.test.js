import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioIdentidad } from '../src/modules/identidad/identidad.service.js'
import { IDENTIDAD_POR_DEFECTO, derivarHorarioTexto } from '../src/lib/identidadTienda.js'

const HORARIO_LLENO = Array.from({ length: 7 }, () => ({
  abierto: true,
  apertura: '09:00',
  cierre: '21:00',
}))

test('derivarHorarioTexto agrupa días consecutivos iguales', () => {
  const horario = [
    ...Array.from({ length: 6 }, () => ({ abierto: true, apertura: '09:00', cierre: '21:00' })),
    { abierto: true, apertura: '10:00', cierre: '15:00' }, // Dom distinto
  ]
  assert.equal(derivarHorarioTexto(horario), 'Lun a Sáb 09:00–21:00 · Dom 10:00–15:00')
})

test('derivarHorarioTexto muestra un día suelto sin rango y los cerrados como "cerrado"', () => {
  const horario = [
    { abierto: true, apertura: '09:00', cierre: '18:00' }, // Lun solo
    ...Array.from({ length: 5 }, () => ({ abierto: true, apertura: '10:00', cierre: '20:00' })),
    { abierto: false, apertura: '00:00', cierre: '00:00' }, // Dom cerrado
  ]
  assert.equal(
    derivarHorarioTexto(horario),
    'Lun 09:00–18:00 · Mar a Sáb 10:00–20:00 · Dom cerrado',
  )
})

test('obtenerIdentidad cae en el default y expone horario + horarioTexto', async () => {
  const servicio = crearServicioIdentidad({
    async obtener() { return null },
  })

  const identidad = await servicio.obtenerIdentidad()

  assert.equal(identidad.nombre, IDENTIDAD_POR_DEFECTO.nombre)
  assert.equal(Array.isArray(identidad.horario), true)
  assert.equal(identidad.horario.length, 7)
  assert.equal(identidad.horarioTexto, 'Lun a Sáb 09:00–21:00 · Dom 10:00–15:00')
  assert.equal('id' in identidad, false)
})

test('actualizarIdentidad guarda la forma proyectada (con horario) y no el texto derivado', async () => {
  const capturado = { guardado: null }
  const fila = {
    nombre: 'Nuevo',
    email: 'n@n.cl',
    telefono: '123',
    whatsapp: null,
    direccion: 'Dir',
    horario: HORARIO_LLENO,
    instagram: null,
    facebook: null,
    tiktok: null,
  }
  const servicio = crearServicioIdentidad({
    async guardar(datos) { capturado.guardado = datos },
    async obtener() { return fila },
  })

  const identidad = await servicio.actualizarIdentidad({
    ...fila,
    horarioTexto: 'no debe guardarse',
    campoExtra: 'ignorado',
  })

  assert.equal('horarioTexto' in capturado.guardado, false)
  assert.equal('campoExtra' in capturado.guardado, false)
  assert.equal(capturado.guardado.horario.length, 7)
  assert.equal(identidad.horarioTexto, 'Lun a Dom 09:00–21:00') // todos iguales
})
