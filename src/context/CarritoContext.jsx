import { createContext, useContext } from "react";
import { useCarrito } from "../hooks/useCarrito.js";

// PIEZA 1: creamos el "canal" del carrito.
const CarritoContext = createContext(null);

// PIEZA 2: el Provider llama al hook UNA sola vez y transmite su valor
// (carrito, totalItems, agregarAlCarrito, etc.) a todo el árbol que envuelve.
export function CarritoProvider({ children }) {
  const carrito = useCarrito();
  return (
    <CarritoContext.Provider value={carrito}>
      {children}
    </CarritoContext.Provider>
  );
}

// PIEZA 3: un hook consumidor propio. En vez de que cada componente escriba
// useContext(CarritoContext), usan useCarritoContext(). Además avisa con un
// error claro si alguien lo usa por fuera del Provider, un bug comun.
//
// La regla react-refresh pide que un archivo con un componente exporte SOLO
// componentes (por el hot-reload). Juntar el provider y su hook en el mismo
// archivo es el patrón estándar de Context, así que desactivamos la regla aquí.
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
