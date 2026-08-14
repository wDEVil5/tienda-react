import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioPaginas } from '../src/modules/paginas/paginas.service.js'

function crearRepoFalso(filas = []) {
  const porSlug = new Map(filas.map((fila) => [fila.slug, fila]))
  const capturado = { guardado: null }
  const repositorio = {
    async obtenerPorSlug(slug) { return porSlug.get(slug) ?? null },
    async listar() { return [...porSlug.values()] },
    async guardar(slug, datos) {
      capturado.guardado = { slug, ...datos }
      return { slug, ...datos, updatedAt: new Date() }
    },
  }
  return { repositorio, capturado }
}

test('obtenerPaginaPublica oculta páginas despublicadas, inexistentes o de slug inválido', async () => {
  const { repositorio } = crearRepoFalso([
    { slug: 'nosotros', titulo: 'Sobre nosotros', cuerpo: '# Hola', publicada: true, updatedAt: new Date() },
    { slug: 'terminos', titulo: 'Términos', cuerpo: '...', publicada: false, updatedAt: new Date() },
  ])
  const servicio = crearServicioPaginas(repositorio)

  const publica = await servicio.obtenerPaginaPublica('nosotros')
  assert.equal(publica.titulo, 'Sobre nosotros')
  assert.equal(publica.cuerpo, '# Hola')

  assert.equal(await servicio.obtenerPaginaPublica('terminos'), null) // despublicada
  assert.equal(await servicio.obtenerPaginaPublica('privacidad'), null) // no existe
  assert.equal(await servicio.obtenerPaginaPublica('hackers'), null) // slug inválido
})

test('listarPaginasAdmin devuelve SIEMPRE las 4 canónicas con su estado', async () => {
  const { repositorio } = crearRepoFalso([
    { slug: 'nosotros', titulo: 'Nosotros edit', cuerpo: 'x', publicada: true, updatedAt: new Date() },
  ])
  const servicio = crearServicioPaginas(repositorio)

  const lista = await servicio.listarPaginasAdmin()
  assert.equal(lista.length, 4)
  const nosotros = lista.find((p) => p.slug === 'nosotros')
  assert.equal(nosotros.existe, true)
  assert.equal(nosotros.publicada, true)
  assert.equal(nosotros.titulo, 'Nosotros edit') // título de la base, no el default

  const faq = lista.find((p) => p.slug === 'faq')
  assert.equal(faq.existe, false)
  assert.equal(faq.publicada, false)
  assert.equal(faq.titulo, 'Preguntas frecuentes') // default canónico
})

test('obtenerPaginaAdmin devuelve plantilla en blanco si no existe y null si el slug es inválido', async () => {
  const { repositorio } = crearRepoFalso()
  const servicio = crearServicioPaginas(repositorio)

  const plantilla = await servicio.obtenerPaginaAdmin('privacidad')
  assert.equal(plantilla.existe, false)
  assert.equal(plantilla.cuerpo, '')
  assert.equal(plantilla.titulo, 'Política de privacidad')

  assert.equal(await servicio.obtenerPaginaAdmin('otra-cosa'), null)
})

test('guardarPaginaAdmin rechaza slugs no canónicos y hace upsert de los válidos', async () => {
  const { repositorio, capturado } = crearRepoFalso()
  const servicio = crearServicioPaginas(repositorio)

  assert.equal(
    await servicio.guardarPaginaAdmin('inyectado', { titulo: 'X', cuerpo: 'y', publicada: true }),
    null,
  )
  assert.equal(capturado.guardado, null) // no intentó guardar

  const guardada = await servicio.guardarPaginaAdmin('faq', {
    titulo: 'FAQ', cuerpo: '## Pregunta', publicada: true,
  })
  assert.equal(guardada.existe, true)
  assert.equal(capturado.guardado.slug, 'faq')
  assert.equal(capturado.guardado.cuerpo, '## Pregunta')
})
