import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioUsuariosAdmin } from '../src/modules/admin/admin-usuarios.service.js'

test('desactivarUsuario revoca el acceso de un operador', async () => {
  let usuarioDesactivado
  const servicio = crearServicioUsuariosAdmin({
    async obtenerPorId() { return { id: 'usuario-2', rol: 'OPERADOR' } },
    async desactivarPorId(id) { usuarioDesactivado = id; return { id, activo: false } },
  })

  const usuario = await servicio.desactivarUsuario('usuario-2', 'usuario-1')

  assert.equal(usuarioDesactivado, 'usuario-2')
  assert.equal(usuario.activo, false)
})

test('desactivarUsuario impide que el administrador se desactive a sí mismo', async () => {
  const servicio = crearServicioUsuariosAdmin({
    async obtenerPorId() { return { id: 'usuario-1', rol: 'ADMIN' } },
  })

  await assert.rejects(
    servicio.desactivarUsuario('usuario-1', 'usuario-1'),
    { code: 'CANNOT_DEACTIVATE_SELF' },
  )
})

test('listarUsuarios no expone hashes ni sesiones', async () => {
  const servicio = crearServicioUsuariosAdmin({
    async listar() {
      return [{
        id: 'usuario-1', nombre: 'Admin', email: 'admin@ejemplo.test', rol: 'ADMIN',
        activo: true, createdAt: new Date('2026-08-02T00:00:00.000Z'),
      }]
    },
  })

  const resultado = await servicio.listarUsuarios()

  assert.equal(resultado.data[0].rol, 'ADMIN')
  assert.equal('passwordHash' in resultado.data[0], false)
})

test('crearOperador solo persiste un hash y el rol OPERADOR', async () => {
  let datosCreacion
  const servicio = crearServicioUsuariosAdmin({
    async crear(datos) { datosCreacion = datos; return { id: 'usuario-2', ...datos } },
  }, async () => 'hash-seguro')

  const usuario = await servicio.crearOperador({
    nombre: 'Operador Uno', email: 'operador@ejemplo.test', contrasena: 'Una frase segura 2026',
  })

  assert.equal(datosCreacion.passwordHash, 'hash-seguro')
  assert.equal(datosCreacion.rol, 'OPERADOR')
  assert.equal(usuario.email, 'operador@ejemplo.test')
})
