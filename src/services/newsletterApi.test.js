import { describe, expect, it, vi } from "vitest";
import { suscribirNewsletter, bajaNewsletter, ErrorNewsletterApi } from "./newsletterApi.js";

describe("newsletterApi", () => {
  const apiUrl = "http://localhost:3000";

  describe("suscribirNewsletter", () => {
    it("llama al endpoint de suscripción con el email correcto", async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 1, email: "test@example.com", estado: "SUSCRITO" }),
      });

      const respuesta = await suscribirNewsletter("test@example.com", {
        fetchImpl,
        apiUrl,
      });

      expect(fetchImpl).toHaveBeenCalledWith(`${apiUrl}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });
      expect(respuesta.email).toBe("test@example.com");
    });

    it("lanza ErrorNewsletterApi si la API no está configurada", async () => {
      await expect(
        suscribirNewsletter("test@example.com", { apiUrl: "" })
      ).rejects.toThrow(ErrorNewsletterApi);
    });

    it("lanza ErrorNewsletterApi con mensaje del servidor si hay error 422", async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ error: "Correo inválido" }),
      });

      await expect(
        suscribirNewsletter("invalido", { fetchImpl, apiUrl })
      ).rejects.toThrowError("Correo inválido");
    });

    it("lanza ErrorNewsletterApi genérico si falla la red", async () => {
      const fetchImpl = vi.fn().mockRejectedValue(new Error("Red desconectada"));

      await expect(
        suscribirNewsletter("test@example.com", { fetchImpl, apiUrl })
      ).rejects.toThrow(ErrorNewsletterApi);
    });
  });

  describe("bajaNewsletter", () => {
    it("llama al endpoint de baja con el token correcto", async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      });

      await bajaNewsletter("token-123", { fetchImpl, apiUrl });

      expect(fetchImpl).toHaveBeenCalledWith(`${apiUrl}/api/newsletter/baja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "token-123" }),
      });
    });

    it("retorna sin error si el servidor devuelve 204", async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const res = await bajaNewsletter("token-123", { fetchImpl, apiUrl });
      expect(res).toBeNull();
    });
  });
});
