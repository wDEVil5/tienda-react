import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import Markdown from "../components/Markdown.jsx";
import { ErrorPaginasApi, obtenerPaginaPublica } from "../services/paginasApi.js";
import styles from "./PaginaContenido.module.css";

// Página pública para el contenido escrito desde /admin/contenido. Recibe el
// slug desde la ruta explícita: la tienda solo expone páginas canónicas.
export default function PaginaContenido({ slug }) {
  const [estado, setEstado] = useState({ clave: null, pagina: null, error: null });
  const [intento, setIntento] = useState(0);
  // La clave permite distinguir una respuesta anterior de la ruta o reintento
  // actual sin reiniciar estado dentro del effect (patrón que React desaconseja).
  const claveSolicitud = `${slug}:${intento}`;

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    let vigente = true;

    obtenerPaginaPublica(slug)
      .then((pagina) => {
        if (vigente) setEstado({ clave: claveSolicitud, pagina, error: null });
      })
      .catch((error) => {
        if (!vigente) return;
        setEstado({
          clave: claveSolicitud,
          pagina: null,
          error: error instanceof ErrorPaginasApi ? error : new ErrorPaginasApi("No pudimos cargar esta información."),
        });
      });

    return () => {
      vigente = false;
    };
  }, [slug, claveSolicitud]);

  if (estado.clave !== claveSolicitud) {
    return (
      <section className={styles.estado} aria-live="polite">
        <span className={styles.loader} aria-hidden="true" />
        <p>Cargando información…</p>
      </section>
    );
  }

  if (estado.error) {
    const noEncontrada = estado.error.status === 404;
    return (
      <section className={styles.estado}>
        <span className={styles.iconoEstado} aria-hidden="true">
          <i className={`fa-solid ${noEncontrada ? "fa-file-circle-xmark" : "fa-circle-exclamation"}`} />
        </span>
        <p className={styles.eyebrow}>Información de la tienda</p>
        <h1>{noEncontrada ? "Esta página no está disponible" : "No pudimos cargar la página"}</h1>
        <p>{estado.error.message}</p>
        <div className={styles.accionesEstado}>
          {!noEncontrada && (
            <button type="button" className={styles.botonPrincipal} onClick={() => setIntento((valor) => valor + 1)}>
              Reintentar
            </button>
          )}
          <Link to="/" className={styles.botonSecundario}>Volver a la tienda</Link>
        </div>
      </section>
    );
  }

  return (
    <article className={styles.pagina}>
      <nav className={styles.miga} aria-label="Ruta de navegación">
        <Link to="/">Tienda</Link>
        <span aria-hidden="true">/</span>
        <span>{estado.pagina.titulo}</span>
      </nav>
      <header className={styles.cabecera}>
        <p className={styles.eyebrow}>SumarketExpress</p>
        <h1>{estado.pagina.titulo}</h1>
      </header>
      <div className={styles.prosa}>
        <Markdown>{estado.pagina.cuerpo}</Markdown>
      </div>
      <footer className={styles.pie}>
        <Link to="/" className={styles.volver}>← Volver a la tienda</Link>
      </footer>
    </article>
  );
}
