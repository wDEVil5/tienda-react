import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CuentaShell from "../components/CuentaShell.jsx";
import TarjetaProducto from "../components/TarjetaProducto.jsx";
import { useFavoritos } from "../context/FavoritosContext.jsx";
import { obtenerFavoritos } from "../services/favoritosApi.js";
import styles from "./Favoritos.module.css";

// Lista de deseos del cliente. Carga las tarjetas completas desde la API y las
// filtra por el set del contexto: quitar un favorito con el corazón hace
// desaparecer la tarjeta al instante, sin recargar.
function Favoritos() {
  const { esFavorito, sincronizarIds } = useFavoritos();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    obtenerFavoritos()
      .then(({ data, ids }) => {
        if (!vigente) return;
        setProductos(data);
        // El set del contexto queda igual a lo recién cargado (verdad del server).
        sincronizarIds(ids);
      })
      .catch((errorSolicitud) => {
        if (vigente) setError(errorSolicitud.message || "No pudimos cargar tus favoritos.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [sincronizarIds]);

  const visibles = productos.filter((producto) => esFavorito(producto.id));

  return (
    <CuentaShell seccion="Favoritos">
      <div className={styles.contenido}>
        <header className={styles.encabezado}>
          <h1>Favoritos</h1>
          {!cargando && !error && visibles.length > 0 && (
            <p className={styles.subtitulo}>
              {visibles.length} {visibles.length === 1 ? "producto guardado" : "productos guardados"}
            </p>
          )}
        </header>

        {error && <p className={styles.error} role="alert">{error}</p>}

        {cargando ? (
          <p className={styles.estado}>Cargando tus favoritos…</p>
        ) : visibles.length === 0 ? (
          <div className={styles.vacio}>
            <span className={styles.iconoVacio} aria-hidden="true">
              <i className="fa-regular fa-heart" />
            </span>
            <h2>Aún no tienes favoritos</h2>
            <p>Toca el corazón en cualquier producto para guardarlo aquí y encontrarlo rápido.</p>
            <Link to="/#catalogo" className={styles.enlaceCatalogo}>Explorar el catálogo</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {visibles.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </div>
    </CuentaShell>
  );
}

export default Favoritos;
