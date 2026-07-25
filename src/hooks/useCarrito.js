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

    // Como CAMBIAR_CANTIDAD pero con un valor ABSOLUTO (para el input editable),
    // no un delta. Igual protegemos el mínimo de 1.
    case "FIJAR_CANTIDAD":
      return estado.map((item) =>
        item.id === accion.id
          ? { ...item, cantidad: Math.max(1, accion.cantidad) }
          : item,
      );

    // Reinserta un ítem previamente eliminado en su posición original (para el
    // "Deshacer"). splice sobre una COPIA para no mutar el estado anterior.
    case "RESTAURAR": {
      const copia = [...estado];
      copia.splice(accion.indice, 0, accion.item);
      return copia;
    }

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

  // Aviso flotante (toast). Objeto { mensaje, key, accion }:
  // - la referencia nueva en cada aviso re-dispara el efecto del Toast (como toBe);
  // - "accion" es opcional: un botón dentro del toast, p. ej. "Deshacer".
  const [aviso, setAviso] = useState(null);
  const descartarAviso = () => setAviso(null);
  const mostrarAviso = (mensaje, accion = null) =>
    setAviso({ mensaje, key: Date.now(), accion });

  // Funciones "envoltorio" traducen una intención a una acción y la despachan.
  // Quien usa el hook no necesita saber que por dentro hay un reducer.
  const agregarAlCarrito = (producto) => {
    dispatch({ type: "AGREGAR", producto });
    mostrarAviso(`${producto.nombre} se agregó al carrito`);
  };

  // Guardamos el ítem y su posición ANTES de borrarlo, para poder devolverlo
  // intacto (con su cantidad) si el usuario pulsa "Deshacer".
  const eliminarDelCarrito = (id) => {
    const indice = carrito.findIndex((item) => item.id === id);
    if (indice === -1) return;
    const eliminado = carrito[indice];
    dispatch({ type: "ELIMINAR", id });
    mostrarAviso(`${eliminado.nombre} eliminado`, {
      texto: "Deshacer",
      alHacer: () => dispatch({ type: "RESTAURAR", item: eliminado, indice }),
    });
  };
  const cambiarCantidad = (id, delta) =>
    dispatch({ type: "CAMBIAR_CANTIDAD", id, delta });
  const fijarCantidad = (id, cantidad) =>
    dispatch({ type: "FIJAR_CANTIDAD", id, cantidad });
  const vaciarCarrito = () => dispatch({ type: "VACIAR" });

  return {
    carrito,
    totalItems,
    aviso,
    descartarAviso,
    agregarAlCarrito,
    eliminarDelCarrito,
    cambiarCantidad,
    fijarCantidad,
    vaciarCarrito,
  };
}
