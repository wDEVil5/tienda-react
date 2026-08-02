import { Link } from "react-router-dom";
import styles from "./Checkout.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { hayApiPedidos } from "../services/pedidosApi.js";

// Página de checkout (esqueleto). El formulario de contacto/entrega y el resumen
// con la cotización llegan en el siguiente paso.
function Checkout() {
  const { carrito } = useCarritoContext();

  if (carrito.length === 0) {
    return (
      <section className={styles.checkout}>
        <h1 className={styles.titulo}>Finalizar compra</h1>
        <p className={styles.vacio}>Tu carrito está vacío.</p>
        <Link to="/#catalogo" className={styles.volver}>
          Ir al catálogo
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.checkout}>
      <Link to="/" className={styles.volver}>
        ← Seguir comprando
      </Link>
      <h1 className={styles.titulo}>Finalizar compra</h1>

      {!hayApiPedidos() && (
        <p className={styles.aviso}>
          El pago en línea está disponible solo en el entorno local con la API
          propia; en la demo pública el catálogo funciona, pero no se pueden
          confirmar pedidos.
        </p>
      )}

      <p className={styles.placeholder}>
        Aquí irán los datos de contacto, la entrega y el resumen del pedido.
      </p>
    </section>
  );
}

export default Checkout;
