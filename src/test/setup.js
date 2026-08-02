// Extiende el `expect` de Vitest con los matchers de jest-dom
// (ej. toBeInTheDocument), útiles para los tests de componentes con RTL.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta lo renderizado tras cada test para que un render no se filtre al
// siguiente (si no, getByRole encontraría elementos de tests anteriores).
afterEach(() => {
  cleanup();
});
