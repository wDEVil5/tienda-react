import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioPromocionesAdmin } from '../src/modules/admin/admin-promociones.service.js'

test('obtenerPromocionParaEdicion incluye sus productos asignados', async () => {
  const servicio = crearServicioPromocionesAdmin({
    async obtenerPorId() {
      return {
        id: 'promo-1', nombre: 'Ofertas', slug: 'ofertas', porcentajeDescuento: 25,
        empiezaEn: new Date('2026-08-01T00:00:00.000Z'), terminaEn: new Date('2026-08-08T00:00:00.000Z'),
        activa: false, productos: [{ productoId: 'producto-1' }, { productoId: 'producto-2' }],
        _count: { productos: 2 },
      }
    },
  })

  const promocion = await servicio.obtenerPromocionParaEdicion('promo-1')

  assert.deepEqual(promocion.productoIds, ['producto-1', 'producto-2'])
})

test('activarPromocion publica una campaña sin solapamientos', async () => {
  let datosActualizacion
  const servicio = crearServicioPromocionesAdmin({
    async obtenerPorId() {
      return {
        id: 'promo-1', nombre: 'Ofertas', slug: 'ofertas', porcentajeDescuento: 25,
        empiezaEn: new Date('2026-08-01T00:00:00.000Z'), terminaEn: new Date('2026-08-08T00:00:00.000Z'),
        activa: false, productos: [{ productoId: 'producto-1' }], _count: { productos: 1 },
      }
    },
    async buscarSolapamientoActivo() { return null },
    async actualizarPorId(_id, datos) {
      datosActualizacion = datos
      return {
        id: 'promo-1', nombre: 'Ofertas', slug: 'ofertas', porcentajeDescuento: 25,
        empiezaEn: new Date('2026-08-01T00:00:00.000Z'), terminaEn: new Date('2026-08-08T00:00:00.000Z'),
        activa: true, _count: { productos: 1 },
      }
    },
  })

  const promocion = await servicio.activarPromocion('promo-1')

  assert.deepEqual(datosActualizacion, { activa: true })
  assert.equal(promocion.activa, true)
})

test('desactivarPromocion conserva la campaña y detiene su efecto', async () => {
  let datosActualizacion
  const servicio = crearServicioPromocionesAdmin({
    async obtenerPorId() { return { id: 'promo-1' } },
    async actualizarPorId(_id, datos) {
      datosActualizacion = datos
      return {
        id: 'promo-1', nombre: 'Ofertas', slug: 'ofertas', porcentajeDescuento: 25,
        empiezaEn: new Date('2026-08-01T00:00:00.000Z'), terminaEn: new Date('2026-08-08T00:00:00.000Z'),
        activa: false, _count: { productos: 1 },
      }
    },
  })

  const promocion = await servicio.desactivarPromocion('promo-1')

  assert.deepEqual(datosActualizacion, { activa: false })
  assert.equal(promocion.activa, false)
})

test('activarPromocion rechaza campañas que se solapan', async () => {
  const servicio = crearServicioPromocionesAdmin({
    async obtenerPorId() {
      return {
        id: 'promo-1', empiezaEn: new Date('2026-08-01T00:00:00.000Z'),
        terminaEn: new Date('2026-08-08T00:00:00.000Z'), productos: [{ productoId: 'producto-1' }],
      }
    },
    async buscarSolapamientoActivo() { return { id: 'promo-2', nombre: 'Otra oferta' } },
  })

  await assert.rejects(servicio.activarPromocion('promo-1'), { code: 'PROMOTION_OVERLAP' })
})

test('crearPromocion genera el slug y la mantiene inactiva hasta revisarla', async () => {
  let datosCreacion
  const servicio = crearServicioPromocionesAdmin({
    async contarProductos() { return 1 },
    async crear(datos) {
      datosCreacion = datos
      return { ...datos, id: 'promo-1', _count: { productos: 1 } }
    },
  })

  const promocion = await servicio.crearPromocion({
    nombre: 'Ofertas de agosto', porcentajeDescuento: 25,
    empiezaEn: '2026-08-01T00:00:00.000Z', terminaEn: '2026-08-08T00:00:00.000Z',
    productoIds: ['producto-1'],
  })

  assert.equal(datosCreacion.slug, 'ofertas-de-agosto')
  assert.equal(datosCreacion.activa, false)
  assert.equal(promocion.productosAsignados, 1)
})

test('crearPromocion rechaza productos que no existen', async () => {
  const servicio = crearServicioPromocionesAdmin({ async contarProductos() { return 0 } })

  await assert.rejects(
    servicio.crearPromocion({ productoIds: ['producto-inexistente'] }),
    { code: 'INVALID_PROMOTION_PRODUCT' },
  )
})

test('listarPromociones adapta campañas y cuenta productos asignados', async () => {
  const servicio = crearServicioPromocionesAdmin({
    async listar() {
      return [{
        id: 'promo-1', nombre: 'Ofertas semanales', slug: 'ofertas-semanales',
        porcentajeDescuento: 25, empiezaEn: new Date('2026-08-01T00:00:00.000Z'),
        terminaEn: new Date('2026-08-08T00:00:00.000Z'), activa: true,
        _count: { productos: 3 },
      }]
    },
  })

  const resultado = await servicio.listarPromociones()

  assert.equal(resultado.data[0].porcentajeDescuento, 25)
  assert.equal(resultado.data[0].productosAsignados, 3)
  assert.equal(resultado.data[0].activa, true)
})
