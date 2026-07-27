import styles from "./ComoComprar.module.css";

// "Cómo comprar": 3 pasos estáticos que explican el flujo de compra. Contenido
// fijo (no depende de datos), así que vive en una constante en el módulo.
const PASOS = [
  {
    n: "01",
    titulo: "Arma tu carrito",
    texto:
      "Busca o navega por categoría. El carrito se guarda aunque cierres la pestaña.",
  },
  {
    n: "02",
    titulo: "Elige entrega y paga",
    texto:
      "Retiro en tienda gratis o despacho a domicilio. Pago con Mercado Pago o tarjeta.",
  },
  {
    n: "03",
    titulo: "Sigue tu pedido",
    texto: "Desde “Mis pedidos” ves el estado: pagada, enviada, entregada.",
  },
];

function ComoComprar() {
  return (
    <section id="como-comprar" className={styles.comoComprar}>
      <h2 className={styles.titulo}>Cómo comprar</h2>

      <div className={styles.grid}>
        {PASOS.map((paso) => (
          <article key={paso.n} className={styles.tarjeta}>
            <span className={styles.numero}>{paso.n}</span>
            <h3 className={styles.pasoTitulo}>{paso.titulo}</h3>
            <p className={styles.pasoTexto}>{paso.texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ComoComprar;
