import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioReglas } from '../src/modules/reglas/reglas.service.js'
import { REGLAS_POR_DEFECTO } from '../src/lib/reglasTienda.js'

test('obtenerReglas arma la configuración y las tarifas desde el repositorio', async () => {
  const servicio = crearServicioReglas({
    async obtenerConfiguracion() {
      return {
        envioGratisDesde: 25000,
        tarifaBase: 3500,
        corteRetiroHoy: '20:00',
        preparacionHoras: 3,
      }
    },
    async listarTarifas() {
      return [{ comuna: 'nunoa', nombre: 'Ñuñoa', tarifa: 1990, plazoHoras: 12 }]
    },
  })

  const reglas = await servicio.obtenerReglas()

  assert.equal(reglas.envioGratisDesde, 25000)
  assert.equal(reglas.corteRetiroHoy, '20:00')
  assert.equal(reglas.tarifasComuna.length, 1)
  assert.deepEqual(reglas.tarifasComuna[0], {
    comuna: 'nunoa',
    nombre: 'Ñuñoa',
    tarifa: 1990,
    plazoHoras: 12,
  })
})

test('obtenerReglas cae en los valores por defecto cuando la base está vacía', async () => {
  const servicio = crearServicioReglas({
    async obtenerConfiguracion() {
      return null
    },
    async listarTarifas() {
      return []
    },
  })

  const reglas = await servicio.obtenerReglas()

  assert.equal(reglas.envioGratisDesde, REGLAS_POR_DEFECTO.envioGratisDesde)
  assert.equal(reglas.tarifasComuna.length, REGLAS_POR_DEFECTO.tarifasComuna.length)
})

test('actualizarReglas deriva la clave de comuna del nombre y guarda transaccional', async () => {
  let guardado = null
  const servicio = crearServicioReglas({
    async obtenerConfiguracion() {
      return { envioGratisDesde: 30000, tarifaBase: 4000, corteRetiroHoy: '18:00', preparacionHoras: 1 }
    },
    async listarTarifas() {
      return guardado?.tarifas ?? []
    },
    async reemplazarReglas(datos) {
      guardado = datos
    },
  })

  await servicio.actualizarReglas({
    envioGratisDesde: 30000,
    tarifaBase: 4000,
    corteRetiroHoy: '18:00',
    preparacionHoras: 1,
    tarifasComuna: [{ nombre: 'Ñuñoa', tarifa: 1990, plazoHoras: 12 }],
  })

  // La clave normalizada se deriva del nombre visible.
  assert.equal(guardado.tarifas[0].comuna, 'nunoa')
  assert.equal(guardado.tarifas[0].nombre, 'Ñuñoa')
  // La configuración escalar va aparte, sin colar tarifasComuna dentro.
  assert.equal(guardado.configuracion.envioGratisDesde, 30000)
  assert.equal(guardado.configuracion.tarifasComuna, undefined)
})
