import { useState, useEffect } from "react";

// Custom hook encapsula todo el estado y la lógica del carrito.
// Es javascript puro (no depende de la UI), así que es reutilizable y testeable
export function useCarrito() {
  const [carrito, setCarrito] = useState(() => {
    try {
      const guardado = localStorage.getItem("carrito");
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      // si el dato guardado está corrupto, JSON.parse lanza error.
      // en vez de romper toda la app, arrancamos con el carrito vacío.
      return [];
    }
  });

  // Guardar: cada vez que el carrito cambie, lo persistimos en localStorage.
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  // Estado derivado: se recalcula solo en cada render, no se guarda.
  const totalItems = carrito.reduce((suma, item) => suma + item.cantidad, 0);

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const itemExistente = prev.find((item) => item.id === producto.id);

      if (itemExistente) {
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item,
      ),
    );
  };

  // Devolvemos un objeto: quien use el hook elige qué necesita, por nombre.
  return {
    carrito,
    totalItems,
    agregarAlCarrito,
    eliminarDelCarrito,
    cambiarCantidad,
  };
}
