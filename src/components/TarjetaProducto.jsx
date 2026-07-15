import styles from "./TarjetaProducto.module.css";

function TarjetaProducto({ producto, onAgregar }) {
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
            

            {enOferta && <span className="badge">Oferta</span>}

            <h3 className={styles.nombre}>{producto.nombre}</h3>
            <p className={styles.categoria}>{producto.categoria}</p>

            <div className={styles.precios}>
                <span className={styles.precio}>
                    ${producto.precio.toLocaleString("en-CL")}
                </span>
                {enOferta && (
                    <span className={styles.precioAntes}>
                        ${producto.precioAnterior.toLocaleString("en-CL")}
                    </span>
                )}
            </div>

            <button
                className={styles.boton}
                onClick={() => onAgregar(producto)}>
                Agregar al carrito
            </button>
        </article>
    );
}

export default TarjetaProducto;