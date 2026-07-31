import { describe, expect, it, vi } from "vitest";
import { obtenerProductos } from "./productosApi.js";

const productoApi = {
  id: "prod_aceite_oliva_500",
  nombre: "Aceite de oliva extra virgen 500 ml",
  precio: 7990,
  precioAnterior: 9990,
  categoria: { nombre: "Despensa" },
  descripcion: "Prensado en frío.",
  stock: 12,
  imagenes: [{ url: "https://ejemplo.cl/aceite.jpg", orden: 1 }],
};

describe("obtenerProductos", () => {
  it("prioriza la API propia y normaliza su respuesta paginada", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [productoApi] }),
    });

    const productos = await obtenerProductos({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/productos?limit=24",
    );
    expect(productos[0]).toMatchObject({
      id: "prod_aceite_oliva_500",
      categoria: "Despensa",
      imagen: "https://ejemplo.cl/aceite.jpg",
    });
  });

  it("usa Fake Store como respaldo si la API local no está disponible", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("API local detenida"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            title: "Producto de respaldo",
            price: 1000,
            image: "https://ejemplo.cl/respaldo.jpg",
            category: "despensa",
            description: "Disponible temporalmente.",
          },
        ],
      });

    const productos = await obtenerProductos({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://fakestoreapi.com/products",
    );
    expect(productos[0].nombre).toBe("Producto de respaldo");
  });
});
