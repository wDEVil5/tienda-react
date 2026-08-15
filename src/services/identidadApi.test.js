import { describe, it, expect } from "vitest";
import { calcularEstadoApertura } from "./identidadApi.js";

// Horario: 0=Lun … 6=Dom. Lun-Sáb 09–21, Dom 10–15.
const HORARIO = [
  { abierto: true, apertura: "09:00", cierre: "21:00" },
  { abierto: true, apertura: "09:00", cierre: "21:00" },
  { abierto: true, apertura: "09:00", cierre: "21:00" },
  { abierto: true, apertura: "09:00", cierre: "21:00" },
  { abierto: true, apertura: "09:00", cierre: "21:00" },
  { abierto: true, apertura: "09:00", cierre: "21:00" },
  { abierto: true, apertura: "10:00", cierre: "15:00" },
];

describe("calcularEstadoApertura", () => {
  it("está abierta dentro del tramo (lunes 12:00)", () => {
    // 2026-08-17 es lunes.
    expect(calcularEstadoApertura(HORARIO, new Date("2026-08-17T12:00:00"))).toEqual({ abierta: true });
  });

  it("está cerrada antes de abrir (lunes 08:00)", () => {
    expect(calcularEstadoApertura(HORARIO, new Date("2026-08-17T08:00:00"))).toEqual({ abierta: false });
  });

  it("cierra exactamente a la hora de cierre (lunes 21:00)", () => {
    expect(calcularEstadoApertura(HORARIO, new Date("2026-08-17T21:00:00"))).toEqual({ abierta: false });
  });

  it("respeta el horario distinto del domingo (dom 16:00 = cerrado)", () => {
    // 2026-08-16 es domingo; cierra 15:00.
    expect(calcularEstadoApertura(HORARIO, new Date("2026-08-16T16:00:00"))).toEqual({ abierta: false });
    expect(calcularEstadoApertura(HORARIO, new Date("2026-08-16T14:00:00"))).toEqual({ abierta: true });
  });

  it("un día marcado cerrado devuelve cerrado", () => {
    const conLunesCerrado = HORARIO.map((d, i) => (i === 0 ? { abierto: false } : d));
    expect(calcularEstadoApertura(conLunesCerrado, new Date("2026-08-17T12:00:00"))).toEqual({ abierta: false });
  });

  it("devuelve null si el horario no es válido", () => {
    expect(calcularEstadoApertura(null)).toBeNull();
    expect(calcularEstadoApertura([])).toBeNull();
  });
});
