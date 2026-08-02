import { prisma } from '../../lib/prisma.js'

// La configuración es una fila única (singleton): un id fijo garantiza que solo
// exista una.
const ID_CONFIG = 'singleton'

export function crearRepositorioReglas(cliente = prisma) {
  return {
    async obtenerConfiguracion() {
      return cliente.configuracionTienda.findUnique({ where: { id: ID_CONFIG } })
    },

    async listarTarifas() {
      return cliente.tarifaComuna.findMany({ orderBy: { tarifa: 'asc' } })
    },

    // Reemplazo transaccional de TODA la configuración, como el botón "Guardar"
    // del panel: upsert del singleton y recrear la tabla de comunas. Al ir en una
    // transacción, un fallo deja las reglas anteriores intactas (nunca a medias).
    async reemplazarReglas({ configuracion, tarifas }) {
      return cliente.$transaction(async (tx) => {
        await tx.configuracionTienda.upsert({
          where: { id: ID_CONFIG },
          create: { id: ID_CONFIG, ...configuracion },
          update: configuracion,
        })
        await tx.tarifaComuna.deleteMany({})
        if (tarifas.length > 0) {
          await tx.tarifaComuna.createMany({ data: tarifas })
        }
      })
    },
  }
}

export const repositorioReglas = crearRepositorioReglas()
