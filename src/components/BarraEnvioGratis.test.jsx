import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BarraEnvioGratis from "./BarraEnvioGratis.jsx";

describe("BarraEnvioGratis", () => {
  it("muestra cuánto falta para el envío gratis", () => {
    render(<BarraEnvioGratis subtotal={17470} umbral={20000} />);

    expect(screen.getByText(/para envío gratis/)).toBeInTheDocument();
    expect(screen.getByText("$2.530")).toBeInTheDocument();

    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "17470");
    expect(barra).toHaveAttribute("aria-valuemax", "20000");
  });

  it("anuncia el envío gratis al alcanzar el umbral", () => {
    render(<BarraEnvioGratis subtotal={24000} umbral={20000} />);

    expect(screen.getByText(/¡Tienes/)).toBeInTheDocument();
    // aria-valuenow no supera el máximo aunque el subtotal sí.
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "20000",
    );
  });

  it("no renderiza nada sin un umbral válido", () => {
    const { container } = render(
      <BarraEnvioGratis subtotal={1000} umbral={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
