import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { requerirRoles } from '../src/modules/auth/auth.middleware.js'

function crearAppConRol(rol) {
  const app = express()
  app.use((request, _response, next) => {
    request.usuario = rol ? { id: 'usuario-1', rol } : null
    next()
  })
  app.get('/admin', requerirRoles('ADMIN'), (_request, response) => {
    response.json({ ok: true })
  })
  return app
}

test('requerirRoles permite al administrador continuar', async () => {
  const response = await request(crearAppConRol('ADMIN')).get('/admin')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { ok: true })
})

test('requerirRoles rechaza un rol no autorizado', async () => {
  const response = await request(crearAppConRol('OPERADOR')).get('/admin')

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
})
