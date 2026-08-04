import { afterEach, describe, expect, it } from "vitest";
import { guardarCheckoutPendiente, obtenerCheckoutPendiente } from "./checkoutPendiente.js";

describe("checkoutPendiente", () => {
  afterEach(() => window.sessionStorage.clear());

  it("recupera la cotización que pertenece al paso de pago actual", () => {
    guardarCheckoutPendiente({
      cotizacion: { total: 20460 },
      itemsVisuales: [{ nombre: "Aceite", imagen: "aceite.jpg" }],
    });

    expect(obtenerCheckoutPendiente()).toMatchObject({
      cotizacion: { total: 20460 },
    });
  });
});
