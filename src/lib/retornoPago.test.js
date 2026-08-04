import { describe, expect, it } from "vitest";
import { obtenerRutaRetornoPago } from "./retornoPago.js";

describe("obtenerRutaRetornoPago", () => {
  it("lleva el retorno público de éxito a la ruta interna y conserva los parámetros de Mercado Pago", () => {
    expect(obtenerRutaRetornoPago(
      "https://wdevil5.github.io/tienda-react/?checkout_return=success&external_reference=pago-1&payment_id=123",
    )).toBe("/tienda-react/pago/exito?external_reference=pago-1&payment_id=123");
  });

  it("no altera una navegación que no viene desde la pasarela", () => {
    expect(obtenerRutaRetornoPago("https://wdevil5.github.io/tienda-react/")).toBeNull();
  });
});
