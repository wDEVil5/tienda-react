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
  }
}

export const repositorioInventarioAdmin = crearRepositorioInventarioAdmin()
