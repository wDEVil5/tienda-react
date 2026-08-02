import { createContext, useContext, useEffect, useState } from "react";
import { obtenerReglas, REGLAS_POR_DEFECTO } from "../services/reglasApi.js";

// Config de tienda (umbral de envío, tarifas...) compartida por el carrito y el
// checkout. Se consulta una sola vez al montar; hasta que llega usa los valores
// por defecto, así la UI nunca queda sin datos ni parpadea vacía.
const ReglasContext = createContext(REGLAS_POR_DEFECTO);

export function ReglasProvider({ children }) {
  const [reglas, setReglas] = useState(REGLAS_POR_DEFECTO);

  useEffect(() => {
    let vigente = true;
    obtenerReglas().then((datos) => {
      if (vigente) setReglas(datos);
    });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <ReglasContext.Provider value={reglas}>{children}</ReglasContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReglas() {
  return useContext(ReglasContext);
}
