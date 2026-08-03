import test from 'node:test'
import assert from 'node:assert/strict'
import {
  crearProcesadorAvisos,
  plantillaReposicion,
} from '../src/modules/avisos/avisos.notificaciones.js'

function crearAviso(id, email) {
  return { id, email, producto: { nombre: 'Leche entera 1 L', slug: 'leche-entera-1-l' } }
}

test('plantillaReposicion arma asunto, texto y enlace a la ficha', () => {
  const mensaje = plantillaReposicion({
    nombre: 'Leche entera 1 L',
    slug: 'leche-entera-1-l',
    urlBase: 'https://tienda.cl',
  })

  assert.equal(mensaje.asunto, 'Volvió el stock: Leche entera 1 L')
  assert.match(mensaje.texto, /Leche entera 1 L/)
  assert.match(mensaje.html, /https:\/\/tienda\.cl\/producto\/leche-entera-1-l/)
})

test('procesarReposiciones envía a cada aviso y marca los notificados', async () => {
  const enviados = []
  let marcados
  const procesador = crearProcesadorAvisos({
    repositorio: {
      async listarListosParaNotificar() {
        return [crearAviso('a1', 'ana@correo.cl'), crearAviso('a2', 'ben@correo.cl')]
      },
      async marcarNotificados(ids) {
        marcados = ids
        return { count: ids.length }
      },
    },
    servicioCorreo: {
      async enviar(mensaje) {
        enviados.push(mensaje.para)
      },
    },
  })

  const resultado = await procesador.procesarReposiciones()

  assert.deepEqual(enviados, ['ana@correo.cl', 'ben@correo.cl'])
  assert.deepEqual(marcados, ['a1', 'a2'])
  assert.deepEqual(resultado, { revisados: 2, notificados: 2, fallidos: 0 })
})

test('un envío que falla no se marca: queda para reintento', async () => {
  let marcados
  const procesador = crearProcesadorAvisos({
    repositorio: {
      async listarListosParaNotificar() {
        return [crearAviso('a1', 'ana@correo.cl'), crearAviso('a2', 'roto@correo.cl')]
      },
      async marcarNotificados(ids) {
        marcados = ids
        return { count: ids.length }
      },
    },
    servicioCorreo: {
      async enviar(mensaje) {
        if (mensaje.para === 'roto@correo.cl') {
          throw new Error('proveedor caído')
        }
      },
    },
  })

  const resultado = await procesador.procesarReposiciones()

  // Solo el que se envió bien se marca; el fallido no aparece.
  assert.deepEqual(marcados, ['a1'])
  assert.deepEqual(resultado, { revisados: 2, notificados: 1, fallidos: 1 })
})

test('procesarReposiciones acota por productoId cuando se le pasa', async () => {
  let argsRecibidos
  const procesador = crearProcesadorAvisos({
    repositorio: {
      async listarListosParaNotificar(limite, productoId) {
        argsRecibidos = { limite, productoId }
        return []
      },
      async marcarNotificados() { return { count: 0 } },
    },
    servicioCorreo: { async enviar() {} },
  })

  await procesador.procesarReposiciones({ productoId: 'p1' })

  assert.equal(argsRecibidos.productoId, 'p1')
})

test('sin pendientes no marca nada', async () => {
  let llamoMarcar = false
  const procesador = crearProcesadorAvisos({
    repositorio: {
      async listarListosParaNotificar() {
        return []
      },
      async marcarNotificados(ids) {
        llamoMarcar = true
        return { count: ids.length }
      },
    },
    servicioCorreo: {
      async enviar() {
        throw new Error('no debería enviar')
      },
    },
  })

  const resultado = await procesador.procesarReposiciones()

  assert.deepEqual(resultado, { revisados: 0, notificados: 0, fallidos: 0 })
  // marcarNotificados se llama con [] (no-op), nunca envía.
  assert.equal(llamoMarcar, true)
})
