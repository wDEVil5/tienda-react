import { prisma } from '../lib/prisma.js'
import { procesadorAvisos } from '../modules/avisos/avisos.notificaciones.js'

// Barrido manual de avisos de reposición: envía los correos pendientes (todos
// los productos) y marca los notificados. Es el respaldo del disparo automático
// que ocurre al reponer stock: sirve para reintentar los que hayan fallado o
// para correrlo de forma programada.
async function enviarAvisosPendientes() {
  const resultado = await procesadorAvisos.procesarReposiciones()
  console.log(
    `Avisos revisados: ${resultado.revisados} · notificados: ${resultado.notificados} · fallidos: ${resultado.fallidos}`,
  )
}

enviarAvisosPendientes()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
