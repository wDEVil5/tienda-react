import {
  ESTADO_STOCK,
  calcularDisponible,
  calcularEstadoStock,
} from '../../lib/estadoStock.js'
import { repositorioInventarioAdmin } from './admin-inventario.repository.js'

// Umbral por defecto de "últimas unidades" cuando el producto no define el suyo.
// Mismo valor que usa el tablero de Resumen (contarStockCritico) para ser coherentes.
const UMBRAL_DEFECTO = 3

export function crearServicioInventarioAdmin(
  repositorio = repositorioInventarioAdmin,
  umbralDefecto = UMBRAL_DEFECTO,
) {
  return {
    // Vista de inventario: cada producto con su disponible y estado de stock
    // derivados (la misma regla del catálogo). El resumen cuenta sobre TODO el
    // conjunto filtrado por texto (antes del filtro "bajo stock"), para que las
    // tarjetas de arriba no cambien al activar el filtro. La paginación se aplica
    // al final, sobre las filas ya filtradas.
    async listarInventario({ page = 1, limit = 20, query = '', soloBajoStock = false } = {}) {
      const productos = await repositorio.listarParaInventario(query)

      const filas = productos.map((producto) => {
        const disponible = calcularDisponible(producto)
        const umbralEfectivo = producto.alertaStockBajo ?? umbralDefecto
        // A diferencia del catálogo público (donde un producto sin umbral no tiene
        // estado intermedio), el panel operativo aplica el umbral efectivo —el
        // propio o el default— para avisar de reposición, igual que "stock crítico"
        // del Resumen. Por eso pasamos umbralEfectivo, no el alertaStockBajo crudo.
        const estadoStock = calcularEstadoStock({ ...producto, alertaStockBajo: umbralEfectivo })
        return {
          id: producto.id,
          nombre: producto.nombre,
          sku: producto.sku,
          estadoProducto: producto.estado,
          stock: producto.stock,
          stockReservado: producto.stockReservado,
          disponible,
          alertaStockBajo: producto.alertaStockBajo,
          umbralEfectivo,
          estadoStock,
        }
      })

      const resumen = {
        total: filas.length,
        disponibles: filas.filter((f) => f.estadoStock === ESTADO_STOCK.DISPONIBLE).length,
        bajos: filas.filter((f) => f.estadoStock === ESTADO_STOCK.ULTIMAS_UNIDADES).length,
        agotados: filas.filter((f) => f.estadoStock === ESTADO_STOCK.AGOTADO).length,
      }

      // "Bajo stock" = necesita reposición: agotado o en últimas unidades.
      const filtradas = soloBajoStock
        ? filas.filter((f) => f.estadoStock !== ESTADO_STOCK.DISPONIBLE)
        : filas

      const total = filtradas.length
      const inicio = (page - 1) * limit
      const data = filtradas.slice(inicio, inicio + limit)

      return {
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        resumen,
      }
    },
  }
}

const servicioInventarioAdmin = crearServicioInventarioAdmin()

export const listarInventarioAdmin = servicioInventarioAdmin.listarInventario
