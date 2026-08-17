import { Link, useNavigate } from "react-router-dom";
import styles from "./TarjetaProducto.module.css";
import ImagenProducto from "./ImagenProducto.jsx";
import Estrellas from "./Estrellas.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { useCuenta } from "../context/CuentaContext.jsx";
import { useFavoritos } from "../context/FavoritosContext.jsx";

function TarjetaProducto({ producto }) {
    const { agregarAlCarrito } = useCarritoContext();
    const { estaAutenticado } = useCuenta();
    const { esFavorito, alternarFavorito } = useFavoritos();
    const navegar = useNavigate();
    const favorito = esFavorito(producto.id);
    const enOferta = producto.precioAnterior !== null;

    // Un invitado no tiene lista de deseos: lo mandamos a iniciar sesión. Con
    // sesión, el toggle es optimista; si la API falla, el contexto revierte solo.
    const alternarCorazon = async () => {
        if (!estaAutenticado) {
            navegar("/login");
            return;
        }
        try {
            await alternarFavorito(producto.id);
        } catch {
            // El corazón ya volvió a su estado previo; no molestamos con un error.
        }
    };
    // % de descuento derivado del precio anterior (se muestra en el badge).
    const descuento = enOferta
        ? Math.round((1 - producto.precio / producto.precioAnterior) * 100)
        : 0;
    const ahorro = enOferta ? producto.precioAnterior - producto.precio : 0;
    const precioPorUnidad = producto.precioPorUnidad
        ? `$${producto.precioPorUnidad.monto.toLocaleString("es-CL")} x ${producto.precioPorUnidad.unidad}`
        : null;

    return (
        <article className={styles.tarjeta}>
            <div className={styles.imagenWrap}>
                <Link to={`/producto/${producto.slug ?? producto.id}`}>
                    <ImagenProducto
                        className={styles.imagen}
                        src={producto.imagen}
                        alt={producto.nombre}
                    />
                </Link>
                {enOferta && <span className={styles.badge}>−{descuento}%</span>}
                <button
                    type="button"
                    className={`${styles.corazon} ${favorito ? styles.corazonActivo : ""}`}
                    onClick={alternarCorazon}
                    aria-pressed={favorito}
                    aria-label={favorito ? `Quitar ${producto.nombre} de favoritos` : `Agregar ${producto.nombre} a favoritos`}
                    title={favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                    <i className={`${favorito ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true"></i>
                </button>
                <button
                    className={styles.boton}
                    onClick={() => agregarAlCarrito(producto)}
                    aria-label={`Agregar ${producto.nombre} al carrito`}
                >
                    <i className="fa-solid fa-plus" aria-hidden="true"></i>
                    Agregar
                </button>
            </div>

            <div className={styles.info}>
                <div className={styles.precios}>
                    <span className={styles.precio}>
                        {"$\u202F"}{producto.precio.toLocaleString("es-CL")}
                    </span>
                    {precioPorUnidad && <span className={styles.precioUnidad}>{precioPorUnidad}</span>}
                </div>
                {enOferta && (
                    <div className={styles.ofertaInfo}>
                        <span className={styles.precioAntes}>
                            {"$\u202F"}{producto.precioAnterior.toLocaleString("es-CL")}
                        </span>
                        <span className={styles.ahorro}>Ahorras ${ahorro.toLocaleString("es-CL")}</span>
                    </div>
                )}
                {producto.marca?.nombre && <p className={styles.marca}>{producto.marca.nombre}</p>}
                <h3 className={styles.nombre}>
                    <Link to={`/producto/${producto.slug ?? producto.id}`}>{producto.nombre}</Link>
                </h3>
                {producto.resenas?.conteo > 0 && (
                    <p className={styles.calificacion}>
                        <Estrellas valor={producto.resenas.promedio ?? 0} tamano={13} />
                        <span className={styles.calificacionConteo}>({producto.resenas.conteo})</span>
                    </p>
                )}
            </div>
        </article>
    );
}

export default TarjetaProducto;
