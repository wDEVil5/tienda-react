import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { bajaNewsletter, ErrorNewsletterApi } from "../services/newsletterApi.js";
import styles from "./NewsletterBaja.module.css";

function NewsletterBaja() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token");
  
  // El caso "sin token" es estado derivable, no un efecto: se resuelve en el
  // inicializador (sin token → ni cargando ni éxito, con el error listo). El
  // efecto solo corre la baja asíncrona cuando SÍ hay token.
  const [cargando, setCargando] = useState(Boolean(token));
  const [exito, setExito] = useState(false);
  const [error, setError] = useState(token ? null : "No se proporcionó un token válido.");
  const procesado = useRef(false);

  useEffect(() => {
    if (!token || procesado.current) return;
    procesado.current = true;

    bajaNewsletter(token)
      .then(() => {
        setExito(true);
      })
      .catch((err) => {
        setError(
          err instanceof ErrorNewsletterApi
            ? err.message
            : "Error al procesar la baja. Intenta de nuevo más tarde."
        );
      })
      .finally(() => {
        setCargando(false);
      });
  }, [token]);

  return (
    <main className={styles.contenedor}>
      <div className={styles.tarjeta}>
        {cargando ? (
          <div className={styles.estadoCargando}>
            <div className={styles.spinner} aria-hidden="true" />
            <p>Procesando tu solicitud...</p>
          </div>
        ) : exito ? (
          <div className={styles.estadoExito}>
            <i className={`fa-solid fa-circle-check ${styles.iconoExito}`} aria-hidden="true"></i>
            <h1>Te has dado de baja</h1>
            <p>
              Ya no recibirás nuestros correos de ofertas semanales. Puedes volver a suscribirte cuando quieras desde el pie de página de la tienda.
            </p>
            <Link to="/" className={styles.botonVolver}>
              Volver a la tienda
            </Link>
          </div>
        ) : (
          <div className={styles.estadoError}>
            <i className={`fa-solid fa-triangle-exclamation ${styles.iconoError}`} aria-hidden="true"></i>
            <h1>No pudimos procesarlo</h1>
            <p>{error}</p>
            <Link to="/" className={styles.botonVolverSecundario}>
              Volver a la tienda
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default NewsletterBaja;
