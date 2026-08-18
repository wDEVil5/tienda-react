import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { hayRedActiva, instalarSondaDeRed, suscribirseARed } from "../lib/sondaDeRed.js";

// Barra de progreso global (estilo Jumbo/NProgress): una franja fina en el borde
// inferior del nav. NO es estética: refleja la carga REAL. Se activa por dos vías:
//
//  1. Sonda de red: cuenta los `fetch` en vuelo, así la barra dura exactamente lo
//     que dura la petición (rápida = parpadeo; lenta = barra larga). Automático
//     para toda la app.
//  2. Contador manual (`iniciarCarga`/`terminarCarga`/`seguir`): para procesos que
//     no pasan por `fetch` y que igual quieras reflejar.
const CargaContext = createContext(null);

export function CargaProvider({ children }) {
  const [redActiva, setRedActiva] = useState(false);
  const [manualActiva, setManualActiva] = useState(false);
  const pendientes = useRef(0);
  // La barra está activa si hay red en vuelo O trabajo manual pendiente.
  const activa = redActiva || manualActiva;

  // Suscripción a la sonda de red. `suscribirseARed` no llama al oyente de
  // inmediato (evita setState sincrónico en el efecto); el estado inicial se
  // sincroniza en el próximo frame por si ya había una petición en curso.
  useEffect(() => {
    instalarSondaDeRed();
    const cancelar = suscribirseARed(setRedActiva);
    const cuadro = requestAnimationFrame(() => setRedActiva(hayRedActiva()));
    return () => {
      cancelAnimationFrame(cuadro);
      cancelar();
    };
  }, []);

  const iniciarCarga = useCallback(() => {
    pendientes.current += 1;
    setManualActiva(pendientes.current > 0);
  }, []);

  const terminarCarga = useCallback(() => {
    pendientes.current = Math.max(0, pendientes.current - 1);
    setManualActiva(pendientes.current > 0);
  }, []);

  // Envuelve una promesa: enciende la barra y la apaga al resolver o fallar.
  const seguir = useCallback(
    (promesa) => {
      iniciarCarga();
      return Promise.resolve(promesa).finally(terminarCarga);
    },
    [iniciarCarga, terminarCarga],
  );

  return (
    <CargaContext.Provider value={{ activa, iniciarCarga, terminarCarga, seguir }}>
      {children}
    </CargaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCarga() {
  const contexto = useContext(CargaContext);
  if (!contexto) {
    throw new Error("useCarga debe usarse dentro de <CargaProvider>.");
  }
  return contexto;
}
