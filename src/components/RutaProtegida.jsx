import { Navigate, useLocation } from "react-router-dom";
import { useCuenta } from "../context/CuentaContext.jsx";
import styles from "./RutaProtegida.module.css";

// Evita renderizar contenido privado mientras todavía comprobamos la cookie.
// Si no hay sesión, preserva el destino para volver allí después de iniciar.
function RutaProtegida({ children }) {
  const { estaAutenticado, cargandoSesion } = useCuenta();
  const ubicacion = useLocation();

  if (cargandoSesion) {
    return <p className={styles.cargando}>Comprobando tu sesión…</p>;
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ desde: ubicacion }} />;
  }

  return children;
}

export default RutaProtegida;
