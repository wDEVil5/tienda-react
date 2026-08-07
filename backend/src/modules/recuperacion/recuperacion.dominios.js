import { repositorioAuth } from '../auth/auth.repository.js'
import { repositorioCuenta } from '../cuenta/cuenta.repository.js'
import { crearNotificadorRecuperacion } from './recuperacion.notificaciones.js'
import { crearServicioRecuperacion } from './recuperacion.service.js'

// Base pública del frontend; el enlace del correo apunta a sus pantallas.
const URL_APP = process.env.FRONTEND_APP_URL || 'http://localhost:5173'

// Adaptador de dominio: CLIENTES (compradores). Traduce la interfaz genérica del
// servicio a los repos de `cuenta`.
const dominioCliente = {
  campoTitular: 'clienteId',
  buscarActivoPorEmail: (email) => repositorioCuenta.buscarClienteActivoPorEmail(email),
  restablecerContrasena: ({ id, passwordHash, ahora }) =>
    repositorioCuenta.restablecerContrasena({ clienteId: id, passwordHash, ahora }),
}

// Adaptador de dominio: STAFF (operadores/admin) → repos de `auth`.
const dominioStaff = {
  campoTitular: 'usuarioId',
  buscarActivoPorEmail: (email) => repositorioAuth.buscarUsuarioActivoPorEmail(email),
  restablecerContrasena: ({ id, passwordHash, ahora }) =>
    repositorioAuth.restablecerContrasena({ usuarioId: id, passwordHash, ahora }),
}

// Cada dominio manda a una pantalla distinta del frontend.
const notificadorCliente = crearNotificadorRecuperacion({
  construirEnlace: (token) => `${URL_APP}/recuperar?token=${encodeURIComponent(token)}`,
})
const notificadorStaff = crearNotificadorRecuperacion({
  construirEnlace: (token) => `${URL_APP}/admin/recuperar?token=${encodeURIComponent(token)}`,
})

export const servicioRecuperacionCliente = crearServicioRecuperacion({
  dominio: dominioCliente,
  notificador: notificadorCliente,
})

export const servicioRecuperacionStaff = crearServicioRecuperacion({
  dominio: dominioStaff,
  notificador: notificadorStaff,
})
