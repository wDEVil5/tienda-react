import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { REGLAS_POR_DEFECTO } from '../../lib/reglasTienda.js'
import { repositorioReglas } from './reglas.repository.js'

// Ensambla las reglas vigentes desde la base y las guarda. Si la base aún no
// tiene configuración (recién creada, sin seed), cae en REGLAS_POR_DEFECTO: la
// tienda nunca queda sin reglas. La forma devuelta es la misma que consume el
// frontend por GET /api/reglas.
export function crearServicioReglas(repositorio = repositorioReglas) {
  async function obtenerReglas() {
    const [configuracion, tarifas] = await Promise.all([
      repositorio.obtenerConfiguracion(),
      repositorio.listarTarifas(),
    ])

    const base = configuracion ?? REGLAS_POR_DEFECTO
    const filas = tarifas.length > 0 ? tarifas : REGLAS_POR_DEFECTO.tarifasComuna

    return {
      envioGratisDesde: base.envioGratisDesde,
      tarifaBase: base.tarifaBase,
      corteRetiroHoy: base.corteRetiroHoy,
      preparacionHoras: base.preparacionHoras,
      tarifasComuna: filas.map((tarifa) => ({
        comuna: tarifa.comuna,
        nombre: tarifa.nombre,
        tarifa: tarifa.tarifa,
        plazoHoras: tarifa.plazoHoras ?? null,
      })),
    }
  }

  async function actualizarReglas(datos) {
    const { tarifasComuna, ...configuracion } = datos

    // La clave `comuna` se deriva del nombre (normalizado): así el lookup por el
    // texto que escribe el comprador siempre coincide y el panel solo pide el
    // nombre visible.
    const tarifas = tarifasComuna.map((tarifa) => ({
      comuna: normalizarTextoBusqueda(tarifa.nombre),
      nombre: tarifa.nombre,
      tarifa: tarifa.tarifa,
      plazoHoras: tarifa.plazoHoras ?? null,
    }))

    await repositorio.reemplazarReglas({ configuracion, tarifas })
    return obtenerReglas()
  }

  return { obtenerReglas, actualizarReglas }
}

export const servicioReglas = crearServicioReglas()
export const obtenerReglas = () => servicioReglas.obtenerReglas()
export const actualizarReglas = (datos) => servicioReglas.actualizarReglas(datos)
