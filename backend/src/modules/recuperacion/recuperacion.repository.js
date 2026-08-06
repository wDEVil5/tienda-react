import { prisma } from '../../lib/prisma.js'

// Persistencia de los tokens de recuperación. La tabla enlaza a un Cliente O a un
// Usuario (exactamente uno); el servicio decide cuál según el dominio.
export function crearRepositorioRecuperacion(db = prisma) {
  return {
    crearToken({ tokenHash, expiraEn, clienteId = null, usuarioId = null }) {
      return db.tokenRecuperacion.create({
        data: { tokenHash, expiraEn, clienteId, usuarioId },
      })
    },

    // Token utilizable: coincide el hash, no se ha usado y no venció.
    buscarTokenVigentePorHash(tokenHash, ahora = new Date()) {
      return db.tokenRecuperacion.findFirst({
        where: { tokenHash, usadoEn: null, expiraEn: { gt: ahora } },
      })
    },

    // Guarda contra doble uso: solo marca si aún estaba sin usar (updateMany
    // devuelve el conteo → 0 significa que otra petición ya lo consumió).
    marcarUsado(id, ahora = new Date()) {
      return db.tokenRecuperacion.updateMany({
        where: { id, usadoEn: null },
        data: { usadoEn: ahora },
      })
    },
  }
}

export const repositorioRecuperacion = crearRepositorioRecuperacion()
