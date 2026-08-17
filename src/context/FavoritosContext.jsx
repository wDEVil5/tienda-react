import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useCuenta } from "./CuentaContext.jsx";
import {
  agregarFavorito,
  obtenerFavoritosIds,
  quitarFavorito,
} from "../services/favoritosApi.js";

const FavoritosContext = createContext(null);

// Estado global de la lista de deseos. Guarda solo el CONJUNTO de ids favoritos
// (barato) para que cualquier tarjeta pinte su corazón sin pedir nada; la página
// "Favoritos" carga las tarjetas completas aparte. Se hidrata al iniciar sesión y
// se vacía al cerrarla. Los favoritos son de cuenta: sin sesión no hay estado.
export function FavoritosProvider({ children }) {
  const { estaAutenticado } = useCuenta();
  const [ids, setIds] = useState(() => new Set());
  // Espejo del set para leer el valor vigente dentro del toggle sin cerrar sobre
  // un estado viejo. Se actualiza en un efecto (no en render) para no romper las
  // reglas de refs.
  const idsRef = useRef(ids);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  useEffect(() => {
    let vigente = true;
    // Con sesión, hidrata desde la API; sin ella, resuelve a vacío. En ambos
    // casos el setState ocurre dentro del `.then` (nunca síncrono en el efecto).
    const cargar = estaAutenticado ? obtenerFavoritosIds() : Promise.resolve([]);
    cargar
      .then((lista) => {
        if (vigente) setIds(new Set(lista));
      })
      .catch(() => {
        // Un fallo al hidratar no debe romper la tienda: se queda sin corazones
        // marcados hasta el próximo intento.
      });
    return () => {
      vigente = false;
    };
  }, [estaAutenticado]);

  const esFavorito = useCallback((productoId) => ids.has(productoId), [ids]);

  // Deja el set exactamente con estos ids. La página "Favoritos" la usa tras
  // cargar sus tarjetas, para que el set sea la verdad y quitar un favorito haga
  // desaparecer la tarjeta al instante (sin una carrera con la hidratación).
  const sincronizarIds = useCallback((lista) => setIds(new Set(lista)), []);

  // Alterna el favorito de forma OPTIMISTA: cambia el corazón al instante y, si
  // la API falla, revierte. Asume sesión iniciada (el botón redirige al login
  // antes de llamar). Devuelve el nuevo estado (true = quedó favorito).
  const alternarFavorito = useCallback(async (productoId) => {
    const eraFavorito = idsRef.current.has(productoId);
    setIds((prev) => {
      const siguiente = new Set(prev);
      if (eraFavorito) siguiente.delete(productoId);
      else siguiente.add(productoId);
      return siguiente;
    });

    try {
      if (eraFavorito) await quitarFavorito(productoId);
      else await agregarFavorito(productoId);
      return !eraFavorito;
    } catch (error) {
      // Revertir al estado previo.
      setIds((prev) => {
        const siguiente = new Set(prev);
        if (eraFavorito) siguiente.add(productoId);
        else siguiente.delete(productoId);
        return siguiente;
      });
      throw error;
    }
  }, []);

  return (
    <FavoritosContext.Provider
      value={{ ids, cantidad: ids.size, esFavorito, alternarFavorito, sincronizarIds }}
    >
      {children}
    </FavoritosContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavoritos() {
  const contexto = useContext(FavoritosContext);
  if (contexto === null) {
    throw new Error("useFavoritos debe usarse dentro de un <FavoritosProvider>.");
  }
  return contexto;
}
