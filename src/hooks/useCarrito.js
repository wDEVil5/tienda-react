import { useReducer, useEffect, useState } from "react";

// Estado inicial: leemos el carrito guardado en localStorage una Unica vez.
function iniciarCarrito() {
  try {
    const guardado = localStorage.getItem("carrito");
    return guardado ? JSON.parse(guardado) : [];
  } catch {
    // si el dato guardado está corrupto, JSON.parse lanza error.
    // en vez de romper toda la app, arrancamos con el carrito vacío.
    return [];
  }
}

// El reducer: UNA sola función que centraliza TODAS las formas de cambiar el carrito.
// Es una función pura: (estado actual, acción) => nuevo estado. sin efectos secundarios.
export function carritoReducer(estado, accion) {
  switch (accion.type) {
    case "AGREGAR": {
      const itemExistente = estado.find((item) => item.id === accion.producto.id);
      if (itemExistente) {
        return estado.map((item) =>
          item.id === accion.producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      return [...estado, { ...accion.producto, cantidad: 1 }];
    }

    case "ELIMINAR":
      return estado.filter((item) => item.id !== accion.id);

    case "CAMBIAR_CANTIDAD":
      return estado.map((item) =>
        item.id === accion.id
          ? { ...item, cantidad: Math.max(1, item.cantidad + accion.delta) }
          : item,
      );

    case "VACIAR":
      return [];

    // Si llega una acción desconocida, no cambiamos nada.
    default:
      return estado;
  }
}

export function useCarrito() {
  // useReducer recibe: (reducer, argInicial, funciónDeInicio).
  // El estado inicial se calcula con iniciarCarrito() la primera vez.
  const [carrito, dispatch] = useReducer(carritoReducer, null, iniciarCarrito);

  // Persistimos el carrito cada vez que cambia.
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  // Estado derivado: se recalcula solo en cada render, no se guarda.
  const totalItems = carrito.reduce((suma, item) => suma + item.cantidad, 0);

  // Aviso flotante (toast). Guardamos un OBJETO, no solo el nombre: cada agregado
  // crea una referencia nueva, así el efecto del Toast se re-dispara aunque
  // agregues el mismo producto dos veces (igualdad por referencia, como en toBe).
  const [aviso, setAviso] = useState(null);
  const descartarAviso = () => setAviso(null);

  // Funciones "envoltorio" traducen una intención a una acción y la despachan.
  // Quien usa el hook no necesita saber que por dentro hay un reducer.
  const agregarAlCarrito = (producto) => {
    dispatch({ type: "AGREGAR", producto });
    setAviso({ nombre: producto.nombre, key: Date.now() });
  };
  const eliminarDelCarrito = (id) => dispatch({ type: "ELIMINAR", id });
  const cambiarCantidad = (id, delta) =>
    dispatch({ type: "CAMBIAR_CANTIDAD", id, delta });
  const vaciarCarrito = () => dispatch({ type: "VACIAR" });

  return {
    carrito,
    totalItems,
    aviso,
    descartarAviso,
    agregarAlCarrito,
    eliminarDelCarrito,
    cambiarCantidad,
    vaciarCarrito,
  };
}
