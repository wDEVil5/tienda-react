import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ImagenProducto from "../components/ImagenProducto.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { crearPedido } from "../services/pedidosApi.js";
import { iniciarPago } from "../services/pagosApi.js";
import {
  actualizarCheckoutPendiente,
  guardarCheckoutPendiente,
  obtenerCheckoutPendiente,
} from "../services/checkoutPendiente.js";
import styles from "./Checkout.module.css";

const clp = (monto) => `$\u202F${Number(monto ?? 0).toLocaleString("es-CL")}`;

function CabeceraCheckoutPago() {
  const pasos = ["Envío", "Pago", "Listo"];

  return (
    <header className={styles.cabecera}>
      <Link to="/" className={styles.logo} aria-label="Volver a Sumarket Express">
        Sumarket<em>Express</em>
      </Link>
      <ol className={styles.progreso} aria-label="Paso 2 de 3">
        {pasos.map((nombre, indice) => {
          const numero = indice + 1;
          const completado = numero < 2;
          const activo = numero === 2;
          return (
            <li
              key={nombre}
              className={`${styles.pasoProgreso} ${
                activo ? styles.pasoActivo : completado ? styles.pasoCompletado : ""
              }`}
            >
              <span className={styles.pasoNumero}>{completado ? "✓" : numero}</span>
              <span>{nombre}</span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}

function CheckoutPago() {
  const navegar = useNavigate();
  const { vaciarCarrito } = useCarritoContext();
  const [checkout, setCheckout] = useState(() => obtenerCheckoutPendiente());
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState("");

  if (!checkout) {
    return (
      <section className={styles.checkout}>
        <CabeceraCheckoutPago />
        <div className={styles.estadoPagoAusente}>
          <span aria-hidden="true"><i className="fa-solid fa-receipt" /></span>
          <h1>No encontramos este checkout</h1>
          <p>Vuelve al carrito para confirmar tu pedido y continuar al pago.</p>
          <button type="button" onClick={() => navegar("/checkout", { replace: true })}>
            Volver al checkout
          </button>
        </div>
      </section>
    );
  }

  const { contacto, cotizacion, direccion: direccionPedido, itemsVisuales = [], modalidad, pedidoCreado } = checkout;
  const direccion = modalidad === "DESPACHO"
    ? [direccionPedido?.calle, direccionPedido?.depto, direccionPedido?.comuna].filter(Boolean).join(", ")
    : "Retiro en tienda · Av. Matta 980, Santiago";

  const cambiarEntrega = () => {
    if (!pedidoCreado) navegar("/checkout", { replace: true });
  };

  const manejarPago = async () => {
    if (!aceptaTerminos || procesandoPago) return;

    setProcesandoPago(true);
    setErrorPago("");
    try {
      // Si la preferencia anterior falló, reutilizamos el pedido persistido en
      // lugar de crear un duplicado. El backend conserva el total congelado.
      let pedido = pedidoCreado;
      if (!pedido) {
        pedido = await crearPedido({
          contacto,
          modalidad,
          direccion: direccionPedido,
          items: itemsVisuales.map(({ id, cantidad }) => ({ productoId: id, cantidad })),
        });
        const siguiente = { ...checkout, pedidoCreado: pedido };
        guardarCheckoutPendiente(siguiente);
        setCheckout(siguiente);
      }

      const pago = await iniciarPago({ pedidoId: pedido.id });
      actualizarCheckoutPendiente({ pedidoCreado: pedido, pagoId: pago.pagoId });
      vaciarCarrito();
      window.location.assign(pago.urlPago);
    } catch (errorSolicitud) {
      setErrorPago(mensajeErrorPago(errorSolicitud));
      setProcesandoPago(false);
    }
  };

  return (
    <section className={styles.checkout}>
      <CabeceraCheckoutPago />
      <div className={styles.layout}>
        <section className={`${styles.tarjeta} ${styles.panelPago}`} aria-labelledby="titulo-pago">
          <div className={styles.entregaPago}>
            <div>
              <span>Entrega</span>
              <p>{modalidad === "DESPACHO" ? `Despacho · ${direccion}` : direccion}</p>
            </div>
            <button type="button" onClick={cambiarEntrega} disabled={Boolean(pedidoCreado)}>Cambiar</button>
          </div>

          <div className={styles.separadorPago} />

          <h1 id="titulo-pago" className={styles.tarjetaTitulo}>Cómo quieres pagar</h1>
          <div className={styles.metodosPago} aria-label="Métodos de pago">
            <article className={`${styles.metodoPago} ${styles.metodoPagoActivo}`}>
              <span className={styles.iconoMetodo} aria-hidden="true"><i className="fa-solid fa-wallet" /></span>
              <strong>Mercado Pago</strong>
              <p>Débito, crédito y saldo</p>
            </article>
            <article className={styles.metodoPago} aria-disabled="true">
              <span className={styles.iconoMetodo} aria-hidden="true"><i className="fa-regular fa-credit-card" /></span>
              <strong>Tarjeta</strong>
              <p>Vía Stripe</p>
            </article>
            <article className={styles.metodoPago} aria-disabled="true">
              <span className={styles.iconoMetodo} aria-hidden="true"><i className="fa-solid fa-building-columns" /></span>
              <strong>Transferencia</strong>
              <p>Confirmación manual</p>
            </article>
          </div>

          <section className={styles.cuotasPago} aria-labelledby="titulo-cuotas">
            <h2 id="titulo-cuotas">Cuotas</h2>
            <div className={styles.opcionesCuotas} aria-label="Cuotas informativas">
              <span className={styles.cuotaActiva}><strong>1 cuota</strong>{clp(cotizacion.total)}</span>
              <span><strong>3 cuotas</strong>{clp(Math.round(cotizacion.total / 3))}</span>
              <span><strong>6 cuotas</strong>{clp(Math.round(cotizacion.total / 6))}</span>
            </div>
            <p>Las cuotas y su interés los define la pasarela, no la tienda.</p>
          </section>

          <div className={styles.lineaPago} />
          <div className={styles.boletaPago}>
            <span>Necesito boleta a nombre de empresa</span>
            <span className={styles.interruptorInactivo} aria-label="Boleta empresa no disponible todavía"><i /></span>
          </div>
          <label className={styles.terminosPago}>
            <input type="checkbox" checked={aceptaTerminos} onChange={(evento) => setAceptaTerminos(evento.target.checked)} />
            <span>Acepto los términos de compra y la política de devoluciones (10 días).</span>
          </label>
          <p className={styles.avisoPasarela}>
            Al pagar te llevamos a la pasarela. No guardamos ningún dato de tu tarjeta en la tienda.
          </p>
        </section>

        <aside className={`${styles.resumen} ${styles.resumenPago}`}>
          <h2 className={styles.resumenTitulo}>Tu pedido ({cotizacion.items.reduce((total, item) => total + item.cantidad, 0)})</h2>
          <ul className={styles.itemsPago}>
            {cotizacion.items.map((item) => {
              const visual = itemsVisuales.find((actual) => actual.nombre === item.nombre);
              return (
                <li key={`${item.sku}-${item.nombre}`} className={styles.itemFila}>
                  <ImagenProducto className={styles.itemImagen} src={visual?.imagen} alt={item.nombre} />
                  <div className={styles.itemInfo}>
                    <div className={styles.itemEncabezado}>
                      <span className={styles.itemNombre} title={item.nombre}>{item.nombre}</span>
                      <span className={styles.itemCantidad}>× {item.cantidad}</span>
                    </div>
                    <span className={styles.itemPrecio}>{clp(item.subtotal)}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={styles.cupon} aria-label="Código de descuento, disponible próximamente">
            <span>Código de descuento</span>
            <span className={styles.cuponAccion}>Aplicar</span>
          </div>
          <div className={styles.montos}>
            <div className={styles.filaMonto}><span>Subtotal</span><span>{clp(cotizacion.subtotal)}</span></div>
            {cotizacion.descuento > 0 && <div className={styles.filaMonto}><span>Descuento</span><span className={styles.descuento}>−{clp(cotizacion.descuento)}</span></div>}
            <div className={styles.filaMonto}><span>Envío</span><span className={cotizacion.costoEnvio === 0 ? styles.gratis : undefined}>{cotizacion.costoEnvio === 0 ? "Gratis" : clp(cotizacion.costoEnvio)}</span></div>
          </div>
          <div className={styles.totalFila}><span>Total</span><span className={styles.totalMonto}>{clp(cotizacion.total)}</span></div>
          {errorPago && <p className={styles.errorPago} role="alert">{errorPago}</p>}
          <button type="button" className={styles.confirmar} onClick={manejarPago} disabled={!aceptaTerminos || procesandoPago}>
            {procesandoPago ? "Abriendo Mercado Pago…" : `Pagar ${clp(cotizacion.total)}`}
          </button>
          <p className={styles.notaServidor}>Montos calculados en el servidor. Mercado Pago confirmará el pago mediante webhook.</p>
        </aside>
      </div>
    </section>
  );
}

function mensajeErrorPago(error) {
  switch (error?.code) {
    case "INSUFFICIENT_STOCK":
      return "Uno o más productos ya no tienen stock suficiente. Vuelve al carrito para ajustarlo.";
    case "PRODUCT_UNAVAILABLE":
      return "Un producto dejó de estar disponible. Vuelve al carrito para revisarlo.";
    case "ORDER_NOT_PAYABLE":
      return "Este pedido ya no está disponible para pago. Revisa tus pedidos o crea uno nuevo.";
    default:
      return error?.message ?? "No pudimos iniciar el pago. Inténtalo nuevamente.";
  }
}

export default CheckoutPago;
