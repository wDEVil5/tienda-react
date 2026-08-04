import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  actualizarPerfilCuenta,
  cerrarSesionCuenta,
  iniciarSesionCuenta,
  obtenerCuenta,
  registrarCuenta,
} from "../services/cuentaApi.js";

const CuentaContext = createContext(null);

// Centraliza la sesión del comprador. La cookie queda en el navegador y el
// frontend conserva únicamente el perfil público devuelto por la API.
export function CuentaProvider({ children }) {
  const [cliente, setCliente] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const recargarSesion = useCallback(async () => {
    setCargandoSesion(true);
    try {
      const cuenta = await obtenerCuenta();
      setCliente(cuenta);
      return cuenta;
    } finally {
      setCargandoSesion(false);
    }
  }, []);

  useEffect(() => {
    // Una API temporalmente dormida no debe bloquear la tienda pública. Las
    // pantallas de cuenta mostrarán su error específico al abrirse o enviar.
    let vigente = true;

    obtenerCuenta()
      .then((cuenta) => {
        if (vigente) setCliente(cuenta);
      })
      .catch(() => {
        if (vigente) setCliente(null);
      })
      .finally(() => {
        if (vigente) setCargandoSesion(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const iniciarSesion = useCallback(async (credenciales) => {
    const resultado = await iniciarSesionCuenta(credenciales);
    setCliente(resultado.cliente);
    return resultado.cliente;
  }, []);

  const registrar = useCallback(async (datos) => {
    const resultado = await registrarCuenta(datos);
    setCliente(resultado.cliente);
    return resultado.cliente;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await cerrarSesionCuenta();
    setCliente(null);
  }, []);

  // Conserva el perfil actualizado en memoria para que cabecera, resumen y
  // cualquier otra vista de cuenta reflejen el cambio sin recargar la página.
  const actualizarPerfil = useCallback(async (datos) => {
    const resultado = await actualizarPerfilCuenta(datos);
    setCliente(resultado.cliente);
    return resultado.cliente;
  }, []);

  return (
    <CuentaContext.Provider
      value={{
        cliente,
        estaAutenticado: cliente !== null,
        cargandoSesion,
        iniciarSesion,
        registrar,
        cerrarSesion,
        actualizarPerfil,
        recargarSesion,
      }}
    >
      {children}
    </CuentaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCuenta() {
  const contexto = useContext(CuentaContext);
  if (contexto === null) {
    throw new Error("useCuenta debe usarse dentro de un <CuentaProvider>.");
  }
  return contexto;
}
