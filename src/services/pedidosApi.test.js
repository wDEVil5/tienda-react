import { describe, expect, it, vi } from "vitest";
import { cotizarPedido, crearPedido, hayApiPedidos } from "./pedidosApi.js";

describe("pedidosApi", () => {
  it("cotiza contra la API propia con el cuerpo esperado", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { subtotal: 5490, descuento: 0, costoEnvio: 2990, total: 8480 } }),
    });

    const cotizacion = await cotizarPedido({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      modalidad: "DESPACHO",
      comuna: "Providencia",
      items: [{ productoId: "p1", cantidad: 1 }],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/pedidos/cotizar",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    const cuerpo = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(cuerpo).toEqual({
      modalidad: "DESPACHO",
      comuna: "Providencia",
      items: [{ productoId: "p1", cantidad: 1 }],
    });
    expect(cotizacion.total).toBe(8480);
  });

  it("crea el pedido y devuelve su data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { numero: 7, estado: "PENDIENTE" } }),
    });

    const pedido = await crearPedido({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      contacto: { nombre: "Camila", email: "c@c.cl", telefono: "+56 9" },
      modalidad: "RETIRO",
      items: [{ productoId: "p1", cantidad: 1 }],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/pedidos",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(pedido.numero).toBe(7);
  });

  it("propaga el código de error de la API (p. ej. sin stock)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: "INSUFFICIENT_STOCK", message: "Sin stock." } }),
    });

    await expect(
      crearPedido({
        fetchImpl,
        apiUrl: "http://localhost:3000/api",
        contacto: { nombre: "C", email: "c@c.cl", telefono: "+56" },
        modalidad: "RETIRO",
        items: [{ productoId: "p1", cantidad: 99 }],
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", status: 409 });
  });

  it("falla con un mensaje claro cuando no hay API configurada", async () => {
    // Se pasa "" (falsy) en vez de undefined: el parámetro por defecto solo
    // reemplaza undefined, así que "" representa de verdad "sin API".
    expect(hayApiPedidos("")).toBe(false);
    await expect(
      cotizarPedido({ apiUrl: "", modalidad: "RETIRO", items: [] }),
    ).rejects.toThrow(/API propia/);
  });
});
