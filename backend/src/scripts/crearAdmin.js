import { prisma } from '../lib/prisma.js'
import { crearHashContrasena, validarContrasenaNueva } from '../modules/auth/contrasena.js'

function obtenerVariableRequerida(nombre) {
  const valor = process.env[nombre]?.trim()

  if (!valor) {
    throw new Error(`${nombre} es obligatoria para crear el administrador.`)
  }

  return valor
}

async function crearAdministradorInicial() {
  const nombre = obtenerVariableRequerida('ADMIN_NAME')
  const email = obtenerVariableRequerida('ADMIN_EMAIL').toLowerCase()
  const contrasena = obtenerVariableRequerida('ADMIN_PASSWORD')

  validarContrasenaNueva(contrasena)

  const passwordHash = await crearHashContrasena(contrasena)
  const usuario = await prisma.usuario.upsert({
    where: { email },
    create: { nombre, email, passwordHash, rol: 'ADMIN', activo: true },
    // Poder repetir el comando permite corregir nombre o regenerar una clave
    // sin insertar cuentas administrativas duplicadas.
    update: { nombre, passwordHash, rol: 'ADMIN', activo: true },
  })

  console.log(`Administrador listo: ${usuario.email}`)
}

crearAdministradorInicial()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
