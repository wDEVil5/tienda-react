import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioDirecciones } from '../src/modules/cuenta/cuenta.direcciones.service.js'

function repoFalso({ total = 0 } = {}) {
  const captura = { crear: null, actualizar: null }
  const repositorio = {
    async contarPorCliente() {
      return total
    },
    async crear(args) {
      captura.crear = args
      return { id: 'd1', ...args.datos, predeterminada: args.hacerPredeterminada }
    },
    async actualizar(args) {
      captura.actualizar = args
      return { id: args.id }
    },
  }
  return { repositorio, captura }
}

const direccion = { calle: 'Av. Uno 123', comuna: 'Ñuñoa', region: 'RM' }

test('la primera dirección queda predeterminada aunque no se pida', async () => {
  const { repositorio, captura } = repoFalso({ total: 0 })
  await crearServicioDirecciones(repositorio).crearDireccion('c1', direccion)

  assert.equal(captura.crear.hacerPredeterminada, true)
  assert.equal(captura.crear.clienteId, 'c1')
  // La bandera no se cuela dentro de los datos de la fila.
  assert.equal(captura.crear.datos.predeterminada, undefined)
})

test('una dirección adicional NO es predeterminada salvo que se pida', async () => {
  const { repositorio, captura } = repoFalso({ total: 2 })
  await crearServicioDirecciones(repositorio).crearDireccion('c1', direccion)
  assert.equal(captura.crear.hacerPredeterminada, false)
})

test('crear con predeterminada:true la marca aunque no sea la primera', async () => {
  const { repositorio, captura } = repoFalso({ total: 3 })
  await crearServicioDirecciones(repositorio).crearDireccion('c1', {
    ...direccion,
    predeterminada: true,
  })
  assert.equal(captura.crear.hacerPredeterminada, true)
})

test('actualizar solo activa la predeterminada cuando se pide true', async () => {
  const { repositorio, captura } = repoFalso({ total: 1 })
  const servicio = crearServicioDirecciones(repositorio)

  await servicio.actualizarDireccion('c1', 'd1', { ...direccion })
  assert.equal(captura.actualizar.hacerPredeterminada, false)

  await servicio.actualizarDireccion('c1', 'd1', { ...direccion, predeterminada: true })
  assert.equal(captura.actualizar.hacerPredeterminada, true)
  assert.equal(captura.actualizar.datos.predeterminada, undefined)
  assert.equal(captura.actualizar.clienteId, 'c1')
})
