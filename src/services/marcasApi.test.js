import { describe, expect, it, vi } from "vitest";
import { crearUrlLogoBrandfetch, obtenerMarcas } from "./marcasApi.js";

describe("marcasApi", () => {
  it("crea la URL pública del Logo API solo con dominio y Client ID", () => {
    expect(crearUrlLogoBrandfetch("nestle.com", "cliente-123"))
      .toBe("https://cdn.brandfetch.io/nestle.com/logo?c=cliente-123");
    expect(crearUrlLogoBrandfetch("nestle.com", "")).toBeNull();
  });

  it("lee las marcas que expone la API propia", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "marca-1", nombre: "Marca", brandfetchDomain: "marca.cl" }] }),
    });

    await expect(obtenerMarcas({ fetchImpl, apiUrl: "http://localhost:3000/api/" }))
      .resolves.toEqual([{ id: "marca-1", nombre: "Marca", brandfetchDomain: "marca.cl" }]);
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3000/api/marcas");
  });

  it("no devuelve datos editoriales falsos cuando la API falla", async () => {
    await expect(obtenerMarcas({ apiUrl: "" })).resolves.toBeNull();
  });
});
