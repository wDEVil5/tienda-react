import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ImagenProducto from "../components/ImagenProducto.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { crearPedido, cotizarPedido } from "../services/pedidosApi.js";
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
      <Link to="/" className={styles.logo} aria-label="Volver a la tienda">
        <span aria-hidden="true">←</span> Volver a la tienda
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
  const { vaciarCarrito, fijarCantidad, eliminarDelCarrito } = useCarritoContext();
  const [checkout, setCheckout] = useState(() => obtenerCheckoutPendiente());
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState("");
  // Productos que quedaron sin stock suficiente al intentar crear el pedido, con
  // cuánto hay disponible. Mientras haya faltantes, el pago se bloquea hasta ajustar.
  const [faltantes, setFaltantes] = useState(null);
  const [ajustando, setAjustando] = useState(false);

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

  // Baja las cantidades sin stock al máximo disponible (quita los agotados),
  // recotiza y actualiza el pedido pendiente y el carrito, todo sin volver al
  // carrito. Al terminar, el cliente ya puede pagar.
  const ajustarYReintentar = async () => {
    if (ajustando || !faltantes) return;
    setAjustando(true);
    setErrorPago("");
    try {
      const porId = new Map(faltantes.map((falta) => [falta.productoId, falta]));
      const nuevosVisuales = itemsVisuales
        .map((item) => {
          const falta = porId.get(item.id);
          return falta ? { ...item, cantidad: falta.disponible } : item;
        })
        .filter((item) => item.cantidad > 0);

      // Sincroniza el carrito real con el mismo ajuste.
      faltantes.forEach((falta) => {
        if (falta.disponible <= 0) eliminarDelCarrito(falta.productoId);
        else fijarCantidad(falta.productoId, falta.disponible);
      });

      // Si no quedó nada que comprar, volvemos al carrito (que estará vacío).
      if (nuevosVisuales.length === 0) {
        vaciarCarrito();
        navegar("/checkout", { replace: true });
        return;
      }

      const nuevaCotizacion = await cotizarPedido({
        modalidad,
        comuna: modalidad === "DESPACHO" ? direccionPedido?.comuna : undefined,
        items: nuevosVisuales.map(({ id, cantidad }) => ({ productoId: id, cantidad })),
      });

      const siguiente = {
        ...checkout,
        itemsVisuales: nuevosVisuales,
        cotizacion: nuevaCotizacion,
        // El pedido no llegó a crearse; forzamos que el próximo pago lo cree limpio.
        pedidoCreado: null,
      };
      guardarCheckoutPendiente(siguiente);
      setCheckout(siguiente);
      setFaltantes(null);
    } catch (errorSolicitud) {
      setErrorPago(mensajeErrorPago(errorSolicitud));
    } finally {
      setAjustando(false);
    }
  };

  const manejarPago = async () => {
    if (!aceptaTerminos || procesandoPago || faltantes) return;

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
      // Sin stock: en vez de un mensaje genérico, mostramos qué productos y
      // ofrecemos ajustarlos en línea (no hace falta volver al carrito).
      if (errorSolicitud?.code === "INSUFFICIENT_STOCK" && Array.isArray(errorSolicitud.details)) {
        setFaltantes(errorSolicitud.details);
        setErrorPago("");
      } else {
        setErrorPago(mensajeErrorPago(errorSolicitud));
      }
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

          {faltantes && (
            <div className={styles.faltantes} role="alert">
              <p className={styles.faltantesTitulo}>
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />{" "}
                {faltantes.length === 1
                  ? "Un producto ya no tiene el stock que pediste:"
                  : "Algunos productos ya no tienen el stock que pediste:"}
              </p>
              <ul className={styles.faltantesLista}>
                {faltantes.map((falta) => (
                  <li key={falta.productoId}>
                    <span className={styles.faltanteNombre} title={falta.nombre}>{falta.nombre}</span>
                    <span className={styles.faltanteDetalle}>
                      {falta.disponible === 0 ? "Agotado" : `Quedan ${falta.disponible}`}
                      <span aria-hidden="true"> · </span>pediste {falta.solicitado}
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" className={styles.ajustar} onClick={ajustarYReintentar} disabled={ajustando}>
                {ajustando ? "Ajustando…" : "Ajustar mi pedido"}
              </button>
              <p className={styles.faltantesNota}>
                Bajamos las cantidades al máximo disponible y quitamos los agotados. Después podrás pagar.
              </p>
            </div>
          )}

          <button type="button" className={styles.confirmar} onClick={manejarPago} disabled={!aceptaTerminos || procesandoPago || Boolean(faltantes)}>
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
