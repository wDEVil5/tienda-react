import { describe, expect, it, vi } from "vitest";
import { obtenerCatalogo } from "./productosApi.js";

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

describe("obtenerCatalogo", () => {
  it("prioriza la API propia y normaliza su respuesta paginada", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [productoApi] }),
    });

    const resultado = await obtenerCatalogo({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/productos?page=1&limit=10&orden=relevancia",
    );
    expect(resultado.productos[0]).toMatchObject({
      id: "prod_aceite_oliva_500",
      categoria: "Despensa",
      imagen: "https://ejemplo.cl/aceite.jpg",
    });
  });

  it("conserva los metadatos de paginación de la API propia", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [productoApi],
        meta: { page: 2, limit: 10, total: 21, totalPages: 3 },
      }),
    });

    const resultado = await obtenerCatalogo({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      page: 2,
    });

    expect(resultado).toMatchObject({
      fuente: "api",
      meta: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/productos?page=2&limit=10&orden=relevancia",
    );
  });

  it("envía el criterio de ordenamiento a la API propia", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [productoApi] }),
    });

    await obtenerCatalogo({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      orden: "precio-desc",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/productos?page=1&limit=10&orden=precio-desc",
    );
  });

  it("envía el término de búsqueda usando el contrato q de la API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [productoApi] }),
    });

    await obtenerCatalogo({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      busqueda: "aceite oliva",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/productos?page=1&limit=10&orden=relevancia&q=aceite+oliva",
    );
  });

  it("envía el slug de categoría sin depender de su nombre visible", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [productoApi] }),
    });

    await obtenerCatalogo({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      categoria: "despensa",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/productos?page=1&limit=10&orden=relevancia&categoria=despensa",
    );
  });

  it("solicita solo ofertas cuando el filtro está activo", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [productoApi] }),
    });

    await obtenerCatalogo({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      soloOfertas: true,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/productos?page=1&limit=10&orden=relevancia&ofertas=true",
    );
  });

  it("envía los extremos de precio solo cuando el usuario los define", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [productoApi] }),
    });

    await obtenerCatalogo({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      precioMin: 4000,
      precioMax: 6000,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/productos?page=1&limit=10&orden=relevancia&precioMin=4000&precioMax=6000",
    );
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

    const resultado = await obtenerCatalogo({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://fakestoreapi.com/products",
    );
    expect(resultado.productos[0].nombre).toBe("Producto de respaldo");
  });
});
