import styles from "./TarjetaProducto.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";

function TarjetaProducto({ producto }) {
    const { agregarAlCarrito } = useCarritoContext();
    const enOferta = producto.precioAnterior !== null;

    return (
        <article className={styles.tarjeta}>
            <div className={styles.imagenWrap}>
                <img
                    className={styles.imagen}
                    src= {producto.imagen} 
                    alt={producto.nombre}
                    />
            </div>
            

            {enOferta && <span className={styles.badge}>Oferta</span>}

            <h3 className={styles.nombre}>{producto.nombre}</h3>
            <p className={styles.categoria}>{producto.categoria}</p>

            <div className={styles.precios}>
                <span className={styles.precio}>
                    ${producto.precio.toLocaleString("es-CL")}
                </span>
                {enOferta && (
                    <span className={styles.precioAntes}>
                        ${producto.precioAnterior.toLocaleString("es-CL")}
                    </span>
                )}
            </div>

            <button
                className={styles.boton}
                onClick={() => agregarAlCarrito(producto)}>
                Agregar al carrito
            </button>
        </article>
    );
}

export default TarjetaProducto;