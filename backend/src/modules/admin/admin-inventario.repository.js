import { prisma } from '../../lib/prisma.js'

/**
 * Consultas de la sección Inventario. Aísla Prisma como el resto de los
 * repositorios para poder inyectar un cliente de prueba.
 */
export function crearRepositorioInventarioAdmin(cliente = prisma) {
  return {
    // Productos no archivados con lo justo para razonar sobre stock, con filtro
    // opcional por texto (nombre o SKU). NO se pagina aquí a propósito: la tienda
    // es una sola (catálogo de cientos de productos), así que el estado de stock,
    // el filtro "bajo stock" y la paginación los resuelve el servicio reutilizando
    // lib/estadoStock.js (la misma regla del catálogo público). Si algún día el
    // catálogo creciera a miles, esto se movería a SQL con comparación de columnas.
    listarParaInventario(query) {
      const texto = typeof query === 'string' ? query.trim() : ''
      return cliente.producto.findMany({
        where: {
          estado: { not: 'ARCHIVADO' },
          ...(texto
            ? {
                OR: [
                  { nombre: { contains: texto, mode: 'insensitive' } },
                  { sku: { contains: texto, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: [{ nombre: 'asc' }],
        select: {
          id: true,
          nombre: true,
          sku: true,
          estado: true,
          stock: true,
          stockReservado: true,
          alertaStockBajo: true,
        },
      })
    },

    // Lee el producto (campos de stock) para validar existencia y calcular el
    // nuevo stock antes de ajustar. null si no existe.
    obtenerParaAjuste(id) {
      return cliente.producto.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          sku: true,
          estado: true,
          stock: true,
          stockReservado: true,
          alertaStockBajo: true,
        },
      })
    },

    // Aplica el ajuste en UNA transacción: actualiza Producto.stock e inserta el
    // MovimientoStock con el delta y el stock resultante (foto para auditar sin
    // recalcular). Devuelve { producto, movimiento }. El stock nuevo lo calcula el
    // servicio (que ya validó que no sea negativo).
    aplicarAjuste({ productoId, nuevoStock, delta, motivo, nota, usuarioId }) {
      return cliente.$transaction(async (transaccion) => {
        const producto = await transaccion.producto.update({
          where: { id: productoId },
          data: { stock: nuevoStock },
          select: {
            id: true,
            nombre: true,
            sku: true,
            estado: true,
            stock: true,
            stockReservado: true,
            alertaStockBajo: true,
          },
        })
        const movimiento = await transaccion.movimientoStock.create({
          data: {
            productoId,
            usuarioId: usuarioId ?? null,
            delta,
            motivo,
            stockResultante: nuevoStock,
            nota: nota ?? null,
          },
          select: {
            id: true,
            delta: true,
            motivo: true,
            stockResultante: true,
            nota: true,
            createdAt: true,
            usuario: { select: { id: true, nombre: true } },
          },
        })
        return { producto, movimiento }
      })
    },

    // Historial de movimientos de un producto (más recientes primero).
    listarMovimientos(productoId, limite = 30) {
      return cliente.movimientoStock.findMany({
        where: { productoId },
        orderBy: { createdAt: 'desc' },
        take: limite,
        select: {
          id: true,
          delta: true,
          motivo: true,
          stockResultante: true,
          nota: true,
          createdAt: true,
          usuario: { select: { id: true, nombre: true } },
        },
      })
    },
  }
}

export const repositorioInventarioAdmin = crearRepositorioInventarioAdmin()
