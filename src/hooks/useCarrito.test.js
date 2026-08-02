import { describe, it, expect } from "vitest";
import { carritoReducer } from "./useCarrito.js";

// El reducer es una función pura, así que testearlo es directo:
// le damos un estado + una acción y verificamos el nuevo estado. Sin React.
describe("carritoReducer", () => {
  it("AGREGAR: agrega un producto nuevo con cantidad 1", () => {
    const estado = [];
    const resultado = carritoReducer(estado, {
      type: "AGREGAR",
      producto: { id: 1, nombre: "Plátano", precio: 990 },
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(1);
    expect(resultado[0].cantidad).toBe(1);
  });

  it("AGREGAR: si el producto ya existe, suma la cantidad en vez de duplicar", () => {
    const estado = [{ id: 1, nombre: "Plátano", precio: 990, cantidad: 1 }];
    const resultado = carritoReducer(estado, {
      type: "AGREGAR",
      producto: { id: 1, nombre: "Plátano", precio: 990 },
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].cantidad).toBe(2);
  });

  it("AGREGAR: con cantidad, agrega un producto nuevo con esa cantidad", () => {
    const estado = [];
    const resultado = carritoReducer(estado, {
      type: "AGREGAR",
      producto: { id: 1, nombre: "Plátano", precio: 990 },
      cantidad: 3,
    });

    expect(resultado[0].cantidad).toBe(3);
  });

  it("AGREGAR: con cantidad, suma esa cantidad a un producto existente", () => {
    const estado = [{ id: 1, nombre: "Plátano", precio: 990, cantidad: 2 }];
    const resultado = carritoReducer(estado, {
      type: "AGREGAR",
      producto: { id: 1, nombre: "Plátano", precio: 990 },
      cantidad: 3,
    });

    expect(resultado[0].cantidad).toBe(5);
  });

  it("AGREGAR: no supera el stock informado por la API", () => {
    const resultado = carritoReducer(
      [{ id: 1, cantidad: 2, stock: 3 }],
      {
        type: "AGREGAR",
        producto: { id: 1, nombre: "Plátano", precio: 990, stock: 3 },
        cantidad: 3,
      },
    );

    expect(resultado[0].cantidad).toBe(3);
  });

  it("AGREGAR: no incorpora productos agotados", () => {
    const resultado = carritoReducer([], {
      type: "AGREGAR",
      producto: { id: 1, nombre: "Plátano", precio: 990, stock: 0 },
    });

    expect(resultado).toEqual([]);
  });

  it("ELIMINAR: quita el producto con ese id", () => {
    const estado = [
      { id: 1, cantidad: 1 },
      { id: 2, cantidad: 1 },
    ];
    const resultado = carritoReducer(estado, { type: "ELIMINAR", id: 1 });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(2);
  });

  it("CAMBIAR_CANTIDAD: aumenta la cantidad con delta +1", () => {
    const estado = [{ id: 1, cantidad: 1 }];
    const resultado = carritoReducer(estado, {
      type: "CAMBIAR_CANTIDAD",
      id: 1,
      delta: 1,
    });

    expect(resultado[0].cantidad).toBe(2);
  });

  it("CAMBIAR_CANTIDAD: la cantidad nunca baja de 1", () => {
    const estado = [{ id: 1, cantidad: 1 }];
    const resultado = carritoReducer(estado, {
      type: "CAMBIAR_CANTIDAD",
      id: 1,
      delta: -1,
    });

    expect(resultado[0].cantidad).toBe(1);
  });

  it("FIJAR_CANTIDAD: fija la cantidad a un valor absoluto", () => {
    const estado = [{ id: 1, cantidad: 3 }];
    const resultado = carritoReducer(estado, {
      type: "FIJAR_CANTIDAD",
      id: 1,
      cantidad: 7,
    });

    expect(resultado[0].cantidad).toBe(7);
  });

  it("FIJAR_CANTIDAD: nunca fija por debajo de 1", () => {
    const estado = [{ id: 1, cantidad: 3 }];
    const resultado = carritoReducer(estado, {
      type: "FIJAR_CANTIDAD",
      id: 1,
      cantidad: 0,
    });

    expect(resultado[0].cantidad).toBe(1);
  });

  it("FIJAR_CANTIDAD: no supera el stock informado", () => {
    const resultado = carritoReducer(
      [{ id: 1, cantidad: 1, stock: 3 }],
      { type: "FIJAR_CANTIDAD", id: 1, cantidad: 9 },
    );

    expect(resultado[0].cantidad).toBe(3);
  });

  it("RESTAURAR: reinserta un ítem en su posición original", () => {
    const estado = [
      { id: 1, cantidad: 1 },
      { id: 3, cantidad: 1 },
    ];
    const item = { id: 2, cantidad: 5 };
    const resultado = carritoReducer(estado, {
      type: "RESTAURAR",
      item,
      indice: 1,
    });

    expect(resultado).toHaveLength(3);
    expect(resultado[1]).toEqual({ id: 2, cantidad: 5 });
  });

  it("VACIAR: deja el carrito vacío", () => {
    const estado = [{ id: 1, cantidad: 3 }];
    const resultado = carritoReducer(estado, { type: "VACIAR" });

    expect(resultado).toEqual([]);
  });

  it("acción desconocida: devuelve el mismo estado sin cambios", () => {
    const estado = [{ id: 1, cantidad: 1 }];
    const resultado = carritoReducer(estado, { type: "ACCION_INEXISTENTE" });

    expect(resultado).toBe(estado);
  });

  it("no muta el estado original (inmutabilidad)", () => {
    const estado = [{ id: 1, cantidad: 1 }];
    carritoReducer(estado, {
      type: "AGREGAR",
      producto: { id: 2, precio: 100 },
    });

    // El estado original debe seguir intacto (con un solo item).
    expect(estado).toHaveLength(1);
  });
});
