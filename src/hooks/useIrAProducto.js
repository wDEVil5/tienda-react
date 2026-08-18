import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { guardarDetalleProducto, obtenerProductoDetalle } from "../services/productosApi.js";

// Navegación "retenida" estilo Jumbo: al hacer clic en un producto se pide su
// ficha ANTES de navegar. La barra de progreso se enciende sola (el fetch pasa
// por la sonda de red), la página actual permanece visible mientras carga, y
// recién cuando el detalle llega se cambia de ruta, mostrándola ya lista.
export function useIrAProducto() {
  const navegar = useNavigate();

  const irAProducto = useCallback(
    async (slug) => {
      if (!slug) return;
      try {
        const producto = await obtenerProductoDetalle({ slug });
        // Se guarda en caché para que la ficha renderice al instante sin refetch.
        guardarDetalleProducto(slug, producto);
      } catch {
        // Si el prefetch falla, navegamos igual: la ficha reintenta por su cuenta.
      }
      navegar(`/producto/${slug}`);
    },
    [navegar],
  );

  // Handler para envolver un <Link>: mantiene el href real (accesibilidad, SEO,
  // "abrir en pestaña nueva") pero intercepta el clic normal para retenerlo.
  const alClicProducto = useCallback(
    (evento, slug) => {
      if (
        evento.defaultPrevented ||
        evento.button !== 0 ||
        evento.metaKey ||
        evento.ctrlKey ||
        evento.shiftKey ||
        evento.altKey
      ) {
        return; // clic con modificador / botón medio: deja pasar la navegación nativa.
      }
      evento.preventDefault();
      irAProducto(slug);
    },
    [irAProducto],
  );

  return { irAProducto, alClicProducto };
}
