import { createContext, useContext } from "react";
import { useCarrito } from "../hooks/useCarrito.js";

// Un único provider conserva carrito y avisos para Header, catálogo, ficha y drawer.
const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const carrito = useCarrito();
  return (
    <CarritoContext.Provider value={carrito}>
      {children}
    </CarritoContext.Provider>
  );
}

// El acceso pasa por este hook para fallar temprano si un consumidor queda fuera
// del provider. Se mantiene aquí junto al provider por cohesión del contexto.
// eslint-disable-next-line react-refresh/only-export-components
export function useCarritoContext() {
  const contexto = useContext(CarritoContext);
  if (contexto === null) {
    throw new Error(
      "useCarritoContext debe usarse dentro de un <CarritoProvider>.",
    );
  }
  return contexto;
}
