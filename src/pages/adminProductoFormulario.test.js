import { describe, expect, it } from "vitest";
import {
  calcularPrecioPorUnidad,
  crearFormularioProducto,
  normalizarPayloadProductoAdmin,
  PRODUCTO_FORMULARIO_INICIAL,
  validarFormularioProducto,
} from "./adminProductoFormulario.js";

// Estas pruebas protegen el contrato antes de conectar el editor visual a la
// API: si cambia la forma del detalle o del payload, fallan cerca del origen.
describe("adminProductoFormulario", () => {
  it("crea valores iniciales compatibles con inputs controlados", () => {
    expect(crearFormularioProducto()).toEqual(PRODUCTO_FORMULARIO_INICIAL);
  });

  it("hidrata los campos relacionados desde el detalle de la API", () => {
    const formulario = crearFormularioProducto({
      precio: 15980,
      categoria: { id: "cat_1" },
      marca: { id: "marca_1" },
      etiquetas: [{ id: "tag_1" }],
      fechaVencimiento: "2026-12-31T00:00:00.000Z",
    });

    expect(formulario).toMatchObject({
      precio: "15980",
      categoriaId: "cat_1",
      marcaId: "marca_1",
      etiquetaIds: ["tag_1"],
      fechaVencimiento: "2026-12-31",
    });
  });

  it("informa errores de campos requeridos y reglas de precio", () => {
    expect(
      validarFormularioProducto({
        ...PRODUCTO_FORMULARIO_INICIAL,
        nombre: "A",
        precio: "1200",
        precioAnterior: "900",
        stock: "-1",
      }),
    ).toMatchObject({
      nombre: expect.any(String),
      precioAnterior: "Debe ser mayor que el precio actual.",
      stock: "El stock debe ser un número entero no negativo.",
      categoriaId: expect.any(String),
      marcaId: expect.any(String),
    });
  });

  it("normaliza el payload de creación sin enviar campos opcionales vacíos", () => {
    expect(
      normalizarPayloadProductoAdmin(
        {
          nombre: "  Aceite de oliva ",
          sku: "ACE-500",
          slug: "",
          descripcion: "  Extra virgen ",
          precio: "15980",
          stock: "4",
          categoriaId: "cat_1",
          marcaId: "marca_1",
          etiquetaIds: ["tag_1"],
          destacado: true,
          precioAnterior: "",
          fechaVencimiento: "",
        },
        { esNuevo: true },
      ),
    ).toEqual({
      nombre: "Aceite de oliva",
      sku: "ACE-500",
      descripcion: "Extra virgen",
      precio: 15980,
      stock: 4,
      categoriaId: "cat_1",
      marcaId: "marca_1",
      etiquetaIds: ["tag_1"],
      destacado: true,
    });
  });

  it("calcula el precio por litro usando la misma regla del catálogo", () => {
    expect(calcularPrecioPorUnidad("15980", "500", "ml")).toEqual({
      monto: 31960,
      unidad: "L",
    });
    expect(calcularPrecioPorUnidad("1200", "1", "un")).toBeNull();
  });

  it("envía null para limpiar opcionales al editar", () => {
    expect(
      normalizarPayloadProductoAdmin(
        {
          ...PRODUCTO_FORMULARIO_INICIAL,
          nombre: "Aceite de oliva",
          sku: "ACE-500",
          descripcion: "Extra virgen",
          precio: "15980",
          stock: "4",
          estado: "PUBLICADO",
          categoriaId: "cat_1",
          marcaId: "marca_1",
          codigoBarras: "",
          origen: "",
          precioAnterior: "",
          fechaVencimiento: "",
        },
        { esNuevo: false },
      ),
    ).toMatchObject({
      estado: "PUBLICADO",
      codigoBarras: null,
      origen: null,
      precioAnterior: null,
      fechaVencimiento: null,
    });
  });
});
