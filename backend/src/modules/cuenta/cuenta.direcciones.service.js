import { repositorioDirecciones } from './cuenta.direcciones.repository.js'

export function crearServicioDirecciones(repositorio = repositorioDirecciones) {
  return {
    listarDirecciones(clienteId) {
      return repositorio.listarPorCliente(clienteId)
    },

    async crearDireccion(clienteId, entrada) {
      const { predeterminada, ...datos } = entrada
      // La primera dirección del cliente queda como predeterminada aunque no lo
      // pida: siempre debe haber una elegible por defecto en el checkout.
      const total = await repositorio.contarPorCliente(clienteId)
      const hacerPredeterminada = predeterminada === true || total === 0
      return repositorio.crear({ clienteId, datos, hacerPredeterminada })
    },

    actualizarDireccion(clienteId, id, entrada) {
      const { predeterminada, ...datos } = entrada
      // Devuelve null si la dirección no existe o no es de este cliente → 404.
      return repositorio.actualizar({
        id,
        clienteId,
        datos,
        hacerPredeterminada: predeterminada === true,
      })
    },

    eliminarDireccion(clienteId, id) {
      return repositorio.eliminar({ id, clienteId })
    },
  }
}

const servicioDirecciones = crearServicioDirecciones()

export const listarDirecciones = servicioDirecciones.listarDirecciones
export const crearDireccion = servicioDirecciones.crearDireccion
export const actualizarDireccion = servicioDirecciones.actualizarDireccion
export const eliminarDireccion = servicioDirecciones.eliminarDireccion
