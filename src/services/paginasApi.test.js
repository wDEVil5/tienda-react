import { describe, expect, it, vi } from "vitest";
import { ErrorPaginasApi, obtenerPaginaPublica } from "./paginasApi.js";

describe("paginasApi", () => {
  it("lee una página pública desde la API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { slug: "nosotros", titulo: "Nosotros", cuerpo: "# Hola" } }),
    });

    await expect(
      obtenerPaginaPublica("nosotros", { fetchImpl, apiUrl: "http://localhost:3000/api/" }),
    ).resolves.toMatchObject({ slug: "nosotros", titulo: "Nosotros" });
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3000/api/paginas/nosotros");
  });

  it("conserva el 404 para que la interfaz pueda mostrar una página no encontrada", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "No encontramos esa página." } }),
    });

    await expect(obtenerPaginaPublica("faq", { fetchImpl, apiUrl: "http://api.test" }))
      .rejects.toMatchObject({ status: 404, message: "No encontramos esa página." });
  });

  it("informa cuando no hay API configurada", async () => {
    await expect(obtenerPaginaPublica("faq", { apiUrl: "" })).rejects.toBeInstanceOf(ErrorPaginasApi);
  });
});
