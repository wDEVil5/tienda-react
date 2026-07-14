function Carrito ({carrito, onEliminar}) {
    const total = carrito.reduce(

        //Inicio:  suma = 0
        //Vuelta 1: suma = 0 + (990 × 2) = 1980
        //Vuelta 2: suma = 1980 + (1200 × 1) = 3180
        //Resultado: 3180

        (suma, item) => suma + item.precio * item.cantidad,
        0
    );

    if (carrito.length === 0) {
        return <p>Tu carrito esta vacio.</p>
    }

    return (
        <aside>
            <h2>Tu carrito</h2>

            {carrito.map((item) => (
                <div key={item.id}>
                    <span>{item.nombre}</span>
                    <span>x{item.cantidad}</span>
                    <span>${(item.precio * item.cantidad).toLocaleString("es-CL")}</span>
                    <button onClick={() => onEliminar(item.id)}>Eliminar</button>
                    
                </div>
            ))}
            <p>Total: ${total.toLocaleString("es-CL")}</p>
            

        </aside>
    )

}

export default Carrito;