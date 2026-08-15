import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioBanners } from '../src/modules/banners/banners.service.js'
import { validarBannerNuevo } from '../src/modules/banners/banners.validacion.js'

function crearRepoFalso(banners = []) {
  const porId = new Map(banners.map((b) => [b.id, b]))
  const capturado = { vigentes: false, creado: null, actualizado: null, eliminado: null }
  const repositorio = {
    async listarVigentes() { capturado.vigentes = true; return banners.map((b) => ({ id: b.id, titulo: b.titulo, imagenUrl: b.imagenUrl, enlace: b.enlace })) },
    async listarTodos() { return banners },
    async obtenerPorId(id) { return porId.get(id) ?? null },
    async crear(datos) { capturado.creado = datos; return { id: 'nuevo', ...datos } },
    async actualizar(id, datos) { capturado.actualizado = { id, datos }; return { ...porId.get(id), ...datos } },
    async eliminar(id) { capturado.eliminado = id },
  }
  return { repositorio, capturado }
}

test('listarBannersPublicos delega en los vigentes del repositorio', async () => {
  const { repositorio, capturado } = crearRepoFalso([
    { id: 'b1', titulo: 'Promo', imagenUrl: 'https://cdn/x.jpg', enlace: '/#catalogo' },
  ])
  const servicio = crearServicioBanners(repositorio, async () => {})

  const banners = await servicio.listarBannersPublicos()
  assert.equal(capturado.vigentes, true)
  assert.equal(banners[0].titulo, 'Promo')
})

test('crearBanner proyecta la forma del panel (sin timestamps)', async () => {
  const { repositorio } = crearRepoFalso()
  const servicio = crearServicioBanners(repositorio, async () => {})

  const banner = await servicio.crearBanner({
    titulo: 'Nuevo', imagenUrl: 'https://cdn/x.jpg', storageKey: 'k', enlace: null,
    orden: 1, activo: true, empiezaEn: null, terminaEn: null,
  })
  assert.equal(banner.id, 'nuevo')
  assert.equal(banner.titulo, 'Nuevo')
  assert.equal('createdAt' in banner, false)
})

test('actualizarBanner devuelve null si no existe', async () => {
  const { repositorio } = crearRepoFalso()
  const servicio = crearServicioBanners(repositorio, async () => {})
  assert.equal(await servicio.actualizarBanner('nope', { titulo: 'x' }), null)
})

test('eliminarBanner borra el banner y su imagen de Cloudinary si tiene storageKey', async () => {
  const { repositorio, capturado } = crearRepoFalso([
    { id: 'b1', titulo: 'Promo', imagenUrl: 'https://cdn/x.jpg', storageKey: 'sumarket/banners/abc', enlace: null },
  ])
  const imagenesBorradas = []
  const servicio = crearServicioBanners(repositorio, async (key) => imagenesBorradas.push(key))

  const ok = await servicio.eliminarBanner('b1')
  assert.equal(ok, true)
  assert.equal(capturado.eliminado, 'b1')
  assert.deepEqual(imagenesBorradas, ['sumarket/banners/abc'])
})

test('eliminarBanner devuelve false si no existe (y no toca imágenes)', async () => {
  const { repositorio } = crearRepoFalso()
  const imagenesBorradas = []
  const servicio = crearServicioBanners(repositorio, async (key) => imagenesBorradas.push(key))

  assert.equal(await servicio.eliminarBanner('nope'), false)
  assert.deepEqual(imagenesBorradas, [])
})

test('validarBannerNuevo normaliza fecha y enlace vacíos a null y exige imagen URL', () => {
  const ok = validarBannerNuevo({
    titulo: 'Promo de la semana',
    imagenUrl: 'https://cdn.cloudinary.com/x.jpg',
    enlace: '',
    empiezaEn: '',
    terminaEn: '2026-08-20T00:00:00.000Z',
  })
  assert.equal(ok.success, true)
  assert.equal(ok.data.enlace, null)
  assert.equal(ok.data.empiezaEn, null)
  assert.ok(ok.data.terminaEn instanceof Date)

  // imagenUrl inválida → falla
  const mal = validarBannerNuevo({ titulo: 'Promo', imagenUrl: 'no-es-url' })
  assert.equal(mal.success, false)
})
