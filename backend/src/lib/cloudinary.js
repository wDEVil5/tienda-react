import { v2 as cloudinary } from 'cloudinary'

function obtenerVariableRequerida(configuracion, nombre) {
  const valor = configuracion[nombre]?.trim()
  if (!valor) {
    throw new Error(`${nombre} es obligatoria para usar Cloudinary.`)
  }
  return valor
}

// La SDK se configura una sola vez y queda aislada de rutas y servicios de
// catálogo. Cambiar de proveedor después no obligará a tocar el dominio.
export function crearClienteCloudinary(configuracion = process.env, sdk = cloudinary) {
  sdk.config({
    cloud_name: obtenerVariableRequerida(configuracion, 'CLOUDINARY_CLOUD_NAME'),
    api_key: obtenerVariableRequerida(configuracion, 'CLOUDINARY_API_KEY'),
    api_secret: obtenerVariableRequerida(configuracion, 'CLOUDINARY_API_SECRET'),
    secure: true,
  })

  return sdk
}

let clienteCloudinary

export function obtenerClienteCloudinary() {
  clienteCloudinary ??= crearClienteCloudinary()
  return clienteCloudinary
}
