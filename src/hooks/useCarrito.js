import { useReducer, useEffect, useState } from "react";

// El stock que llega desde la API acota la experiencia del cliente. Si el
// producto no lo informa (como Fake Store), el carrito conserva el flujo libre.
function limitarPorStock(cantidad, stock) {
  return Number.isInteger(stock) && stock >= 0
    ? Math.min(cantidad, stock)
    : cantidad;
}

// La inicialización diferida evita leer localStorage en cada render.
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
      // Cantidad opcional: si la acción no la trae, agregamos 1 (comportamiento
      // de siempre). Así los llamados existentes no cambian.
      const cantidad = accion.cantidad ?? 1;
      const itemExistente = estado.find((item) => item.id === accion.producto.id);
      if (itemExistente) {
        const cantidadFinal = limitarPorStock(
          itemExistente.cantidad + cantidad,
          accion.producto.stock,
        );
        if (cantidadFinal === itemExistente.cantidad) return estado;

        return estado.map((item) =>
          item.id === accion.producto.id
            // Refrescamos los datos públicos al volver a agregar el producto,
            // pero su cantidad siempre queda dentro del stock informado.
            ? { ...item, ...accion.producto, cantidad: cantidadFinal }
            : item,
        );
      }
      const cantidadFinal = limitarPorStock(cantidad, accion.producto.stock);
      return cantidadFinal > 0
        ? [...estado, { ...accion.producto, cantidad: cantidadFinal }]
        : estado;
    }

    case "ELIMINAR":
      return estado.filter((item) => item.id !== accion.id);

    case "CAMBIAR_CANTIDAD":
      return estado.map((item) => {
        if (item.id !== accion.id) return item;
        const cantidad = limitarPorStock(
          Math.max(1, item.cantidad + accion.delta),
          item.stock,
        );
        return cantidad > 0 ? { ...item, cantidad } : item;
      });

    // Como CAMBIAR_CANTIDAD pero con un valor ABSOLUTO (para el input editable),
    // no un delta. Igual protegemos el mínimo de 1.
    case "FIJAR_CANTIDAD":
      return estado.map((item) => {
        if (item.id !== accion.id) return item;
        const cantidad = limitarPorStock(Math.max(1, accion.cantidad), item.stock);
        return cantidad > 0 ? { ...item, cantidad } : item;
      });

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

  // El aviso es efímero: una referencia nueva reinicia su temporizador. La acción
  // opcional permite restaurar un ítem eliminado sin persistir un historial completo.
  const [aviso, setAviso] = useState(null);
  const descartarAviso = () => setAviso(null);
  const mostrarAviso = (mensaje, accion = null, tipo = "exito") =>
    setAviso({ mensaje, key: Date.now(), accion, tipo });

  // Funciones "envoltorio" traducen una intención a una acción y la despachan.
  // Quien usa el hook no necesita saber que por dentro hay un reducer.
  const agregarAlCarrito = (producto, cantidad = 1) => {
    const itemExistente = carrito.find((item) => item.id === producto.id);
    const cantidadActual = itemExistente?.cantidad ?? 0;
    const stock = producto.stock;
    const stockConocido = Number.isInteger(stock) && stock >= 0;
    const disponible = stockConocido ? stock - cantidadActual : cantidad;

    if (disponible <= 0) {
      mostrarAviso(
        `No quedan más unidades de ${producto.nombre}`,
        null,
        "advertencia",
      );
      return;
    }

    const cantidadAceptada = stockConocido ? Math.min(cantidad, disponible) : cantidad;
    dispatch({ type: "AGREGAR", producto, cantidad: cantidadAceptada });
    mostrarAviso(
      cantidadAceptada < cantidad
        ? `Solo quedan ${cantidadAceptada} unidades de ${producto.nombre}`
        : `${producto.nombre} se agregó al carrito`,
      null,
      cantidadAceptada < cantidad ? "advertencia" : "exito",
    );
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
