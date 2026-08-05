import { repositorioResumen } from './admin-resumen.repository.js'

// Períodos que acepta el tablero. El frontend ofrece el selector "Este mes ▾".
export const PERIODOS_RESUMEN = ['hoy', 'semana', 'mes', 'mes-pasado']

// Umbral global de stock crítico cuando un producto no define el suyo propio.
const UMBRAL_STOCK_CRITICO = Number(process.env.UMBRAL_STOCK_CRITICO) || 3

const NOMBRE_MES = new Intl.DateTimeFormat('es-CL', { month: 'long' })

function inicioDia(fecha) {
  const dia = new Date(fecha)
  dia.setHours(0, 0, 0, 0)
  return dia
}

function sumarDias(fecha, dias) {
  const resultado = new Date(fecha)
  resultado.setDate(resultado.getDate() + dias)
  return resultado
}

function inicioMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

function sumarMeses(fecha, meses) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1)
}

// Clave de día local (YYYY-MM-DD) para agrupar pagos por jornada sin ambigüedad
// de zona horaria.
function claveDia(fecha) {
  const dia = new Date(fecha)
  const mes = String(dia.getMonth() + 1).padStart(2, '0')
  const numero = String(dia.getDate()).padStart(2, '0')
  return `${dia.getFullYear()}-${mes}-${numero}`
}

// Devuelve el rango [desde, hasta) del período pedido, el rango equivalente
// anterior (para la comparación "+18% vs …") y la etiqueta de ese baseline.
function rangoPeriodo(periodo, ahora) {
  switch (periodo) {
    case 'hoy': {
      const desde = inicioDia(ahora)
      const hasta = sumarDias(desde, 1)
      return {
        actual: { desde, hasta },
        anterior: { desde: sumarDias(desde, -1), hasta: desde },
        comparacion: 'ayer',
      }
    }
    case 'semana': {
      const hasta = sumarDias(inicioDia(ahora), 1)
      const desde = sumarDias(hasta, -7)
      return {
        actual: { desde, hasta },
        anterior: { desde: sumarDias(desde, -7), hasta: desde },
        comparacion: 'semana anterior',
      }
    }
    case 'mes-pasado': {
      const desde = sumarMeses(inicioMes(ahora), -1)
      const hasta = inicioMes(ahora)
      return {
        actual: { desde, hasta },
        anterior: { desde: sumarMeses(desde, -1), hasta: desde },
        comparacion: NOMBRE_MES.format(sumarMeses(desde, -1)),
      }
    }
    case 'mes':
    default: {
      const desde = inicioMes(ahora)
      const hasta = sumarMeses(desde, 1)
      return {
        actual: { desde, hasta },
        anterior: { desde: sumarMeses(desde, -1), hasta: desde },
        comparacion: NOMBRE_MES.format(sumarMeses(desde, -1)),
      }
    }
  }
}

// Variación porcentual redondeada. null cuando no hay base con que comparar
// (no inventamos un +∞ ni un 100% engañoso partiendo de cero).
function variacion(actual, anterior) {
  if (!anterior) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}

function promedio(monto, cantidad) {
  return cantidad ? Math.round(monto / cantidad) : 0
}

export function crearServicioResumen(repositorio = repositorioResumen) {
  return {
    async obtenerResumen({ periodo = 'mes', ahora = new Date() } = {}) {
      const { actual, anterior, comparacion } = rangoPeriodo(periodo, ahora)

      const [
        ventasActual,
        ventasAnterior,
        modalidad,
        pedidos,
        pendientes,
        stockCritico,
        pedidosPorEstado,
        pagosPorEstado,
      ] = await Promise.all([
        repositorio.ventasAprobadas(actual),
        repositorio.ventasAprobadas(anterior),
        repositorio.ventasPorModalidad(actual),
        repositorio.contarPedidos(actual),
        repositorio.contarPendientesPreparar(),
        repositorio.contarStockCritico(UMBRAL_STOCK_CRITICO),
        repositorio.contarPedidosPorEstado(),
        repositorio.sumarPagosPorEstado(),
      ])

      const sinPago = { monto: 0, cantidad: 0 }

      const ticketActual = promedio(ventasActual.monto, ventasActual.pagos)
      const ticketAnterior = promedio(ventasAnterior.monto, ventasAnterior.pagos)

      return {
        periodo,
        comparacion,
        rango: { desde: actual.desde, hasta: actual.hasta },
        ventas: {
          actual: ventasActual.monto,
          anterior: ventasAnterior.monto,
          variacion: variacion(ventasActual.monto, ventasAnterior.monto),
        },
        pedidos: { total: pedidos, pendientesPreparar: pendientes },
        ticketPromedio: {
          actual: ticketActual,
          anterior: ticketAnterior,
          variacion: variacion(ticketActual, ticketAnterior),
        },
        stockCritico,
        modalidad,
        // Snapshots en vivo (no dependen del período): estado actual de la tienda.
        pedidosPorEstado,
        cobros: {
          aprobado: pagosPorEstado.APROBADO ?? sinPago,
          pendiente: pagosPorEstado.PENDIENTE ?? sinPago,
        },
      }
    },

    // Serie de ventas por día para el gráfico de tendencia. Ventana FIJA de los
    // últimos `dias` (por defecto 14) terminando hoy, independiente del período
    // de los KPIs: es una vista estable de la tendencia reciente. Rellena con
    // cero los días sin ventas para que el eje temporal no tenga huecos.
    async obtenerVentasDiarias({ dias = 14, ahora = new Date() } = {}) {
      const hasta = sumarDias(inicioDia(ahora), 1) // fin de hoy (exclusivo)
      const desde = sumarDias(hasta, -dias)
      const pagos = await repositorio.pagosAprobadosEntre({ desde, hasta })

      const serie = []
      for (let dia = new Date(desde); dia < hasta; dia = sumarDias(dia, 1)) {
        serie.push({ fecha: new Date(dia), monto: 0 })
      }
      const indicePorDia = new Map(serie.map((entrada, indice) => [claveDia(entrada.fecha), indice]))
      for (const pago of pagos) {
        const indice = indicePorDia.get(claveDia(pago.createdAt))
        if (indice !== undefined) serie[indice].monto += pago.monto
      }

      return { desde, hasta, serie }
    },

    // Más vendidos del período, en DOS rankings (por unidades y por ingresos):
    // el líder en cajas no siempre es el que más plata deja, y el toggle del
    // frontend cambia entre ambos sin volver a pedir datos.
    async obtenerMasVendidos({ periodo = 'mes', limite = 6, ahora = new Date() } = {}) {
      const { actual } = rangoPeriodo(periodo, ahora)
      const filas = await repositorio.masVendidos(actual)
      const mejores = (clave) =>
        [...filas].sort((a, b) => b[clave] - a[clave]).slice(0, limite)
      return { porUnidades: mejores('unidades'), porIngresos: mejores('ingresos') }
    },
  }
}

const servicioResumen = crearServicioResumen()

export const obtenerResumen = servicioResumen.obtenerResumen
export const obtenerVentasDiarias = servicioResumen.obtenerVentasDiarias
export const obtenerMasVendidos = servicioResumen.obtenerMasVendidos
