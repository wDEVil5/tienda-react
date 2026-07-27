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

    return (
        <article className={styles.tarjeta}>
            <div className={styles.imagenWrap}>
                <Link to={`/producto/${producto.id}`}>
                    <ImagenProducto
                        className={styles.imagen}
                        src={producto.imagen}
                        alt={producto.nombre}
                    />
                </Link>
                {enOferta && <span className={styles.badge}>−{descuento}%</span>}
            </div>

            <h3 className={styles.nombre}>
                <Link to={`/producto/${producto.id}`}>{producto.nombre}</Link>
            </h3>

            <div className={styles.pie}>
                <div className={styles.precios}>
                    {enOferta && (
                        <span className={styles.precioAntes}>
                            ${producto.precioAnterior.toLocaleString("es-CL")}
                        </span>
                    )}
                    <span className={styles.precio}>
                        ${producto.precio.toLocaleString("es-CL")}
                    </span>
                </div>

                <button
                    className={styles.boton}
                    onClick={() => agregarAlCarrito(producto)}
                    aria-label={`Agregar ${producto.nombre} al carrito`}
                >
                    <i className="fa-solid fa-plus" aria-hidden="true"></i>
                </button>
            </div>
        </article>
    );
}

export default TarjetaProducto;
