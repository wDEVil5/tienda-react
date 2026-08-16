import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./ComoComprar.module.css";

// Página "Cómo comprar": 3 pasos estáticos del flujo de compra. Se enlaza desde
// el footer (columna Ayuda). Contenido fijo, sin datos del servidor.
const PASOS = [
  {
    n: "01",
    titulo: "Arma tu carrito",
    texto: "Busca o navega por categoría y agrega productos. El carrito se guarda aunque cierres la pestaña.",
  },
  {
    n: "02",
    titulo: "Elige entrega y paga",
    texto: "Retiro en tienda gratis o despacho a domicilio. Paga con Mercado Pago o tarjeta, de forma segura.",
  },
  {
    n: "03",
    titulo: "Sigue tu pedido",
    texto: "Desde “Mis pedidos” ves el estado en todo momento: pagada, en preparación, enviada y entregada.",
  },
];

export default function ComoComprar() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <article className={styles.pagina}>
      <nav className={styles.miga} aria-label="Ruta de navegación">
        <Link to="/">Tienda</Link>
        <span aria-hidden="true">/</span>
        <span>Cómo comprar</span>
      </nav>

      <header className={styles.cabecera}>
        <p className={styles.eyebrow}>Información de la tienda</p>
        <h1>Cómo comprar</h1>
        <p className={styles.intro}>Comprar en SumarketExpress toma solo tres pasos.</p>
      </header>

      <ol className={styles.pasos}>
        {PASOS.map((paso) => (
          <li key={paso.n} className={styles.paso}>
            <span className={styles.numero}>{paso.n}</span>
            <div>
              <h2 className={styles.pasoTitulo}>{paso.titulo}</h2>
              <p className={styles.pasoTexto}>{paso.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <footer className={styles.pie}>
        <Link to="/" className={styles.volver}>← Volver a la tienda</Link>
      </footer>
    </article>
  );
}
