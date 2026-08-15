import { prisma } from '../../lib/prisma.js'

export function crearRepositorioBanners(cliente = prisma) {
  return {
    // Banners visibles AHORA: activos y dentro de vigencia (empiezaEn/terminaEn
    // opcionales). Ordenados por `orden` y, a igualdad, por antigüedad.
    listarVigentes(ahora = new Date()) {
      return cliente.banner.findMany({
        where: {
          activo: true,
          AND: [
            { OR: [{ empiezaEn: null }, { empiezaEn: { lte: ahora } }] },
            { OR: [{ terminaEn: null }, { terminaEn: { gt: ahora } }] },
          ],
        },
        orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, titulo: true, imagenUrl: true, enlace: true },
      })
    },

    // Todos los banners para el panel (incluye inactivos y fuera de vigencia).
    listarTodos() {
      return cliente.banner.findMany({
        orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
      })
    },

    obtenerPorId(id) {
      return cliente.banner.findUnique({ where: { id } })
    },

    crear(datos) {
      return cliente.banner.create({ data: datos })
    },

    actualizar(id, datos) {
      return cliente.banner.update({ where: { id }, data: datos })
    },

    eliminar(id) {
      return cliente.banner.delete({ where: { id } })
    },
  }
}

export const repositorioBanners = crearRepositorioBanners()
