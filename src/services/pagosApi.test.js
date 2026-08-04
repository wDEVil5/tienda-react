import { describe, expect, it, vi } from "vitest";
import { iniciarPago, obtenerEstadoPago } from "./pagosApi.js";

describe("pagosApi", () => {
  it("pide una preferencia de pago para un pedido ya creado", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { urlPago: "https://pasarela.example/pago" } }),
    });

    await expect(iniciarPago({
      pedidoId: "pedido-1",
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    })).resolves.toEqual({ urlPago: "https://pasarela.example/pago" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/pagos",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ pedidoId: "pedido-1" }),
      }),
    );
  });

  it("consulta el estado persistido sin asumir el resultado del retorno", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "pago-1", estado: "PENDIENTE" } }),
    });

    await expect(obtenerEstadoPago({
      pagoId: "pago-1",
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    })).resolves.toEqual({ id: "pago-1", estado: "PENDIENTE" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/pagos/pago-1",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
