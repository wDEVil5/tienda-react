import { prisma } from '../../lib/prisma.js'

const seleccionAtributo = {
  id: true,
  nombre: true,
  slug: true,
  tipo: true,
  categoriaId: true,
  orden: true,
  activo: true,
  _count: { select: { valores: true } },
  opciones: { select: { id: true, nombre: true, slug: true, orden: true, activa: true, _count: { select: { valores: true } } }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] },
}

export function crearRepositorioAtributosAdmin(cliente = prisma) {
  return {
    categoria(id) {
      return cliente.categoria.findUnique({ where: { id }, select: { id: true, slug: true } })
    },
    listar(categoriaId) {
      return cliente.atributoCategoria.findMany({
        where: { categoriaId }, select: seleccionAtributo, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      })
    },
    atributo(id) {
      return cliente.atributoCategoria.findUnique({ where: { id }, select: seleccionAtributo })
    },
    crearAtributo(data) {
      return cliente.atributoCategoria.create({ data, select: seleccionAtributo })
    },
    actualizarAtributo(id, data) {
      return cliente.atributoCategoria.update({ where: { id }, data, select: seleccionAtributo })
    },
    eliminarAtributo(id) { return cliente.atributoCategoria.delete({ where: { id } }) },
    opcion(id) {
      return cliente.opcionAtributo.findUnique({
        where: { id },
        select: { id: true, nombre: true, atributoId: true, _count: { select: { valores: true } } },
      })
    },
    crearOpcion(data) {
      return cliente.opcionAtributo.create({
        data, select: { id: true, nombre: true, slug: true, orden: true, activa: true },
      })
    },
    actualizarOpcion(id, data) {
      return cliente.opcionAtributo.update({
        where: { id }, data, select: { id: true, nombre: true, slug: true, orden: true, activa: true },
      })
    },
    eliminarOpcion(id) { return cliente.opcionAtributo.delete({ where: { id } }) },
  }
}
export const repositorioAtributosAdmin = crearRepositorioAtributosAdmin()
