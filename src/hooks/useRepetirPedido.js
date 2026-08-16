import { useState } from "react";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { obtenerPedidoCuenta } from "../services/cuentaApi.js";

// Centraliza "volver a pedir": agrega al carrito los productos de un pedido que
// aún tienen stock. `repetirPedido` cuando ya se tiene el detalle cargado;
// `repetirPorId` cuando solo se tiene el id (lista/resumen) y hay que buscarlo.
export function useRepetirPedido() {
  const { agregarAlCarrito, mostrarAviso } = useCarritoContext();
  const [repitiendoId, setRepitiendoId] = useState(null);

  const agregarItems = (items) => {
    const disponibles = (items ?? []).filter((item) => item.productoActual?.stock > 0);
    if (disponibles.length === 0) {
      mostrarAviso("Los productos de este pedido ya no están disponibles.", null, "advertencia");
      return false;
    }
    disponibles.forEach((item) => agregarAlCarrito(item.productoActual, item.cantidad));
    mostrarAviso(
      `${disponibles.length} ${disponibles.length === 1 ? "producto se agregó" : "productos se agregaron"} al carrito`,
    );
    return true;
  };

  const repetirPedido = (pedido) => agregarItems(pedido?.items);

  const repetirPorId = async (id) => {
    if (repitiendoId) return;
    setRepitiendoId(id);
    try {
      const pedido = await obtenerPedidoCuenta(id);
      agregarItems(pedido?.items);
    } catch {
      mostrarAviso("No pudimos repetir el pedido. Intenta de nuevo.", null, "advertencia");
    } finally {
      setRepitiendoId(null);
    }
  };

  return { repetirPedido, repetirPorId, repitiendoId };
}
