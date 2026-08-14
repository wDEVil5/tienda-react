import {
  ESTADO_STOCK,
  calcularDisponible,
  calcularEstadoStock,
} from '../../lib/estadoStock.js'
import { repositorioInventarioAdmin } from './admin-inventario.repository.js'

// Umbral por defecto de "últimas unidades" cuando el producto no define el suyo.
// Mismo valor que usa el tablero de Resumen (contarStockCritico) para ser coherentes.
const UMBRAL_DEFECTO = 3

export class ErrorInventario extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// Deriva la fila de inventario (disponible + estado de stock) de un producto.
// A diferencia del catálogo público (donde un producto sin umbral no tiene estado
// intermedio), el panel operativo aplica el umbral efectivo —el propio o el
// default— para avisar de reposición, igual que "stock crítico" del Resumen.
function derivarFila(producto, umbralDefecto) {
  const umbralEfectivo = producto.alertaStockBajo ?? umbralDefecto
  return {
    id: producto.id,
    nombre: producto.nombre,
    sku: producto.sku,
    estadoProducto: producto.estado,
    stock: producto.stock,
    stockReservado: producto.stockReservado,
    disponible: calcularDisponible(producto),
    alertaStockBajo: producto.alertaStockBajo,
    umbralEfectivo,
    estadoStock: calcularEstadoStock({ ...producto, alertaStockBajo: umbralEfectivo }),
  }
}

export function crearServicioInventarioAdmin(
  repositorio = repositorioInventarioAdmin,
  umbralDefecto = UMBRAL_DEFECTO,
) {
  return {
    // Vista de inventario: cada producto con su disponible y estado de stock
    // derivados. El resumen cuenta sobre TODO el conjunto filtrado por texto
    // (antes del filtro "bajo stock"), para que las tarjetas no cambien al activar
    // el filtro. La paginación se aplica al final, sobre las filas ya filtradas.
    async listarInventario({ page = 1, limit = 20, query = '', soloBajoStock = false } = {}) {
      const productos = await repositorio.listarParaInventario(query)
      const filas = productos.map((producto) => derivarFila(producto, umbralDefecto))

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

    // Ajuste manual de stock. Devuelve { fila, movimiento } o null si el producto
    // no existe (→ 404). Reglas de negocio (con el stock actual a la vista):
    //  - signo coherente con el motivo (ENTRADA suma, MERMA resta),
    //  - el stock resultante no puede quedar negativo.
    // El usuarioId SIEMPRE viene de la sesión (la ruta lo pasa), nunca del body.
    async ajustarStock({ productoId, delta, motivo, nota, usuarioId }) {
      const producto = await repositorio.obtenerParaAjuste(productoId)
      if (!producto) return null

      if (motivo === 'ENTRADA' && delta <= 0) {
        throw new ErrorInventario('MOTIVO_SIGNO', 'Una entrada debe sumar unidades.')
      }
      if (motivo === 'MERMA' && delta >= 0) {
        throw new ErrorInventario('MOTIVO_SIGNO', 'Una merma debe restar unidades.')
      }

      const nuevoStock = producto.stock + delta
      if (nuevoStock < 0) {
        throw new ErrorInventario(
          'STOCK_NEGATIVO',
          `El ajuste dejaría el stock en ${nuevoStock}. El stock actual es ${producto.stock}.`,
        )
      }

      const { producto: actualizado, movimiento } = await repositorio.aplicarAjuste({
        productoId,
        nuevoStock,
        delta,
        motivo,
        nota,
        usuarioId,
      })

      return { fila: derivarFila(actualizado, umbralDefecto), movimiento }
    },

    async listarMovimientos(productoId) {
      // Si el producto no existe, devolvemos null para que la ruta responda 404
      // en vez de una lista vacía indistinguible de "sin movimientos".
      const producto = await repositorio.obtenerParaAjuste(productoId)
      if (!producto) return null
      return repositorio.listarMovimientos(productoId)
    },
  }
}

const servicioInventarioAdmin = crearServicioInventarioAdmin()

export const listarInventarioAdmin = servicioInventarioAdmin.listarInventario
export const ajustarStockAdmin = servicioInventarioAdmin.ajustarStock
export const listarMovimientosAdmin = servicioInventarioAdmin.listarMovimientos
