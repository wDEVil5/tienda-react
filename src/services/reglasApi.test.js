import { describe, expect, it, vi } from "vitest";
import { obtenerReglas, REGLAS_POR_DEFECTO } from "./reglasApi.js";

describe("reglasApi", () => {
  it("lee las reglas de la API propia y las mezcla sobre los defaults", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { envioGratisDesde: 25000, tarifaBase: 3500 } }),
    });

    const reglas = await obtenerReglas({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3000/api/reglas");
    expect(reglas.envioGratisDesde).toBe(25000);
    expect(reglas.tarifaBase).toBe(3500);
    // Un campo no devuelto por la API conserva su default (no rompe la UI).
    expect(reglas.corteRetiroHoy).toBe(REGLAS_POR_DEFECTO.corteRetiroHoy);
  });

  it("usa los valores por defecto cuando no hay API configurada", async () => {
    const reglas = await obtenerReglas({ apiUrl: "" });
    expect(reglas).toEqual(REGLAS_POR_DEFECTO);
  });

  it("cae a los defaults si la API falla", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("red caída"));
    const reglas = await obtenerReglas({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });
    expect(reglas).toEqual(REGLAS_POR_DEFECTO);
  });
});
