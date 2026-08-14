import { prisma } from '../../lib/prisma.js'

// La identidad es una fila única (singleton): un id fijo garantiza que solo
// exista una, igual que ConfiguracionTienda.
const ID_IDENTIDAD = 'singleton'

export function crearRepositorioIdentidad(cliente = prisma) {
  return {
    obtener() {
      return cliente.identidadTienda.findUnique({ where: { id: ID_IDENTIDAD } })
    },

    // Upsert del singleton: crea la fila la primera vez, la actualiza después.
    guardar(datos) {
      return cliente.identidadTienda.upsert({
        where: { id: ID_IDENTIDAD },
        create: { id: ID_IDENTIDAD, ...datos },
        update: datos,
      })
    },
  }
}

export const repositorioIdentidad = crearRepositorioIdentidad()
