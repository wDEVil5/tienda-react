import { createContext, useCallback, useContext, useState } from "react";
import ModalAcceso from "../components/ModalAcceso.jsx";

const AccesoModalContext = createContext(null);

// Abre el modal de acceso (login/registro) SOBRE la página actual, sin navegar a
// /login. Acepta un `mensaje` dinámico (por qué se pide iniciar sesión) y un
// `onExito` que se ejecuta al completar el login (para reanudar la acción que lo
// disparó, p. ej. agregar a favoritos).
export function AccesoModalProvider({ children }) {
  const [estado, setEstado] = useState(null); // { modo, mensaje, onExito } | null

  const abrirAcceso = useCallback((opciones = {}) => {
    setEstado({
      modo: opciones.modo ?? "login",
      mensaje: opciones.mensaje ?? "",
      onExito: opciones.onExito ?? null,
    });
  }, []);

  const cerrar = useCallback(() => setEstado(null), []);

  // Al completar el login: cerramos y ejecutamos la acción pendiente (si hay).
  const alCompletar = useCallback(() => {
    const accion = estado?.onExito;
    setEstado(null);
    accion?.();
  }, [estado]);

  return (
    <AccesoModalContext.Provider value={{ abrirAcceso }}>
      {children}
      {estado && (
        <ModalAcceso
          modoInicial={estado.modo}
          mensaje={estado.mensaje}
          alCerrar={cerrar}
          alCompletar={alCompletar}
        />
      )}
    </AccesoModalContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccesoModal() {
  const contexto = useContext(AccesoModalContext);
  if (contexto === null) {
    throw new Error("useAccesoModal debe usarse dentro de <AccesoModalProvider>.");
  }
  return contexto;
}
