import { Link } from "react-router-dom";
import styles from "./TarjetaProducto.module.css";
import ImagenProducto from "./ImagenProducto.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";

function TarjetaProducto({ producto }) {
    const { agregarAlCarrito } = useCarritoContext();
    const enOferta = producto.precioAnterior !== null;
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
            </div>
        </article>
    );
}

export default TarjetaProducto;
