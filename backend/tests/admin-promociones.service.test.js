import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioPromocionesAdmin } from '../src/modules/admin/admin-promociones.service.js'

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
