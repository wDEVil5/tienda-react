import { Link, useLocation } from "react-router-dom";
import { useCuenta } from "../context/CuentaContext.jsx";
import styles from "./RutaProtegida.module.css";

// Protege la cuenta sin redirigir de inmediato: explica el acceso requerido y
// conserva la ubicación completa para volver tras entrar o crear una cuenta.
function RutaProtegida({ children }) {
  const { estaAutenticado, cargandoSesion } = useCuenta();
  const ubicacion = useLocation();

  if (cargandoSesion) {
    return <p className={styles.cargando}>Comprobando tu sesión…</p>;
  }

  if (!estaAutenticado) {
    return (
      <section className={styles.pantalla} aria-labelledby="titulo-ruta-protegida">
        <div className={styles.icono} aria-hidden="true">
          <i className="fa-solid fa-lock" />
        </div>
        <h1 id="titulo-ruta-protegida">Necesitas iniciar sesión</h1>
        <p className={styles.descripcion}>
          Guardamos a dónde ibas: al entrar te llevamos directo a
          <code>{ubicacion.pathname}</code>.
        </p>
        <div className={styles.acciones}>
          <Link to="/login" state={{ desde: ubicacion }} className={styles.entrar}>
            Entrar
          </Link>
          <Link to="/registro" state={{ desde: ubicacion }} className={styles.crear}>
            Crear cuenta
          </Link>
        </div>
        <p className={styles.nota}>Tu cuenta y tus pedidos están protegidos.</p>
      </section>
    );
  }

  return children;
}

export default RutaProtegida;
