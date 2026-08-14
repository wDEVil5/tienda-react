import { IDENTIDAD_POR_DEFECTO } from '../../lib/identidadTienda.js'
import { repositorioIdentidad } from './identidad.repository.js'

// Campos que expone la identidad, en orden. Se usa para proyectar tanto la fila
// de la base como el default a la MISMA forma (sin timestamps ni id).
const CAMPOS = [
  'nombre',
  'email',
  'telefono',
  'whatsapp',
  'direccion',
  'horarioAtencion',
  'instagram',
  'facebook',
  'tiktok',
]

function proyectar(fuente) {
  return Object.fromEntries(CAMPOS.map((campo) => [campo, fuente[campo] ?? null]))
}

// Ensambla la identidad vigente desde la base y la guarda. Si la base aún no
// tiene fila (recién creada, sin seed), cae en IDENTIDAD_POR_DEFECTO: la tienda
// nunca queda sin identidad. La forma devuelta es la que consume el frontend.
export function crearServicioIdentidad(repositorio = repositorioIdentidad) {
  async function obtenerIdentidad() {
    const fila = await repositorio.obtener()
    return proyectar(fila ?? IDENTIDAD_POR_DEFECTO)
  }

  async function actualizarIdentidad(datos) {
    // Normaliza opcionales vacíos a null (el editor manda "" al borrar un campo).
    const limpio = proyectar(datos)
    await repositorio.guardar(limpio)
    return obtenerIdentidad()
  }

  return { obtenerIdentidad, actualizarIdentidad }
}

export const servicioIdentidad = crearServicioIdentidad()
export const obtenerIdentidad = () => servicioIdentidad.obtenerIdentidad()
export const actualizarIdentidad = (datos) => servicioIdentidad.actualizarIdentidad(datos)
