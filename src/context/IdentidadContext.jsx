import { createContext, useContext, useEffect, useState } from "react";
import { obtenerIdentidad, IDENTIDAD_POR_DEFECTO } from "../services/identidadApi.js";

// Identidad de la tienda (nombre, contacto, dirección, horario, redes) compartida
// por el footer y la marca. Se consulta una sola vez al montar; hasta que llega
// usa los valores por defecto, así la UI nunca queda sin datos ni parpadea vacía.
const IdentidadContext = createContext(IDENTIDAD_POR_DEFECTO);

export function IdentidadProvider({ children }) {
  const [identidad, setIdentidad] = useState(IDENTIDAD_POR_DEFECTO);

  useEffect(() => {
    let vigente = true;
    obtenerIdentidad().then((datos) => {
      if (vigente) setIdentidad(datos);
    });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <IdentidadContext.Provider value={identidad}>{children}</IdentidadContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIdentidad() {
  return useContext(IdentidadContext);
}
