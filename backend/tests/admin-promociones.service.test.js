import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioPromocionesAdmin } from '../src/modules/admin/admin-promociones.service.js'

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
