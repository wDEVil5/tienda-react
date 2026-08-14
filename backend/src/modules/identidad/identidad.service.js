import { IDENTIDAD_POR_DEFECTO, derivarHorarioTexto } from '../../lib/identidadTienda.js'
import { repositorioIdentidad } from './identidad.repository.js'

// Campos ALMACENADOS de la identidad, en orden. Se usa para proyectar tanto la
// fila de la base como el default a la MISMA forma (sin timestamps ni id). El
// texto del horario NO se guarda: se deriva al leer.
const CAMPOS = [
  'nombre',
  'email',
  'telefono',
  'whatsapp',
  'direccion',
  'horario',
  'instagram',
  'facebook',
  'tiktok',
]

function proyectar(fuente) {
  return Object.fromEntries(CAMPOS.map((campo) => [campo, fuente[campo] ?? null]))
}

// Ensambla la identidad vigente desde la base y la guarda. Si la base aún no
// tiene fila (recién creada, sin seed), cae en IDENTIDAD_POR_DEFECTO: la tienda
// nunca queda sin identidad. Añade `horarioTexto` derivado del horario para que
// el front lo muestre sin recalcular.
export function crearServicioIdentidad(repositorio = repositorioIdentidad) {
  async function obtenerIdentidad() {
    const fila = await repositorio.obtener()
    const base = proyectar(fila ?? IDENTIDAD_POR_DEFECTO)
    return { ...base, horarioTexto: derivarHorarioTexto(base.horario) }
  }

  async function actualizarIdentidad(datos) {
    // Solo se persisten los campos conocidos; el horarioTexto (derivado) nunca
    // llega aquí porque no está en CAMPOS.
    await repositorio.guardar(proyectar(datos))
    return obtenerIdentidad()
  }

  return { obtenerIdentidad, actualizarIdentidad }
}

export const servicioIdentidad = crearServicioIdentidad()
export const obtenerIdentidad = () => servicioIdentidad.obtenerIdentidad()
export const actualizarIdentidad = (datos) => servicioIdentidad.actualizarIdentidad(datos)
