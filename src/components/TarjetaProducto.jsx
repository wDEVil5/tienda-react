function TarjetaProducto({ producto }) {
    const enOferta = producto.precioAnterior !== null;

    return (
        <article className="tarjeta">
            <img src= {producto.imagen} alt={producto.nombre}/>

            {enOferta && <span className="badge">Oferta</span>}

            <h3>{producto.nombre}</h3>
            <p>{producto.descripcion}</p>

            <div className="precios">
                <span className="precio">
                    ${producto.precio.toLocaleString("en-CL")}
                </span>
                {enOferta && (
                    <span className="precio-antes">
                        ${producto.precioAnterior.toLocaleString("en-CL")}
                    </span>
                )}
            </div>

            <button>Agregar al carrito</button>
        </article>
    )
}

export default TarjetaProducto;