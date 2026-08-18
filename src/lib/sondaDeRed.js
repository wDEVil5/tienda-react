// Sonda de red: cuenta las peticiones `fetch` en curso para que la barra de
// progreso refleje el TIEMPO REAL de carga —rápida = parpadeo corto; lenta =
// dura lo que dura la red— en TODA la app, sin cablear página por página.
//
// Parchea `window.fetch` una sola vez: cada petición suma al contador al empezar
// y resta al terminar (con éxito o error). Los oyentes reciben si hay algo en
// vuelo. Es el mismo mecanismo que usan las barras tipo NProgress.

let activas = 0
const oyentes = new Set()

// Guardamos el `fetch` original para poder hacer peticiones "silenciosas" que no
// muevan la barra (p. ej. el autocompletar mientras se tipea).
let fetchOriginal = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : undefined

function emitir() {
  const hay = activas > 0
  for (const oyente of oyentes) oyente(hay)
}

let instalada = false

export function instalarSondaDeRed() {
  if (instalada || typeof window === 'undefined' || !window.fetch) return
  instalada = true
  fetchOriginal = window.fetch.bind(window)

  window.fetch = (...args) => {
    activas += 1
    emitir()
    let promesa
    try {
      promesa = fetchOriginal(...args)
    } catch (error) {
      // Falla sincrónica (rara): igual hay que descontar.
      activas = Math.max(0, activas - 1)
      emitir()
      throw error
    }
    return promesa.finally(() => {
      activas = Math.max(0, activas - 1)
      emitir()
    })
  }
}

// `fetch` que NO cuenta para la barra: para cargas de fondo que no deben hacerla
// parpadear (el autocompletar dispara una petición por cada pausa al tipear).
export function fetchSilencioso(...args) {
  return (fetchOriginal ?? fetch)(...args)
}

export function suscribirseARed(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function hayRedActiva() {
  return activas > 0
}
