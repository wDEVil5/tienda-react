import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ImagenProducto from "../components/ImagenProducto.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { obtenerPedidoCuenta } from "../services/cuentaApi.js";
import styles from "./DetallePedido.module.css";

const ETIQUETAS_ESTADO = {
  PENDIENTE: "Pendiente",
  PREPARANDO: "En preparación",
  LISTO_PARA_RETIRO: "Listo para retiro",
  ENVIADO: "Enviada",
  ENTREGADO: "Entregada",
  CANCELADO: "Cancelada",
};

const TITULOS_ESTADO = {
  PENDIENTE: "Pedido recibido",
  PREPARANDO: "Estamos preparando tu pedido",
  LISTO_PARA_RETIRO: "Listo para retirar",
  ENVIADO: "Pedido en camino",
  ENTREGADO: "Pedido entregado",
  CANCELADO: "Pedido cancelado",
};

function formatearCLP(monto) {
  return `\u0024${Number(monto ?? 0).toLocaleString("es-CL")}`;
}

function formatearFecha(fecha, incluirHora = false) {
  const fechaPedido = new Date(fecha);
  if (Number.isNaN(fechaPedido.valueOf())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    ...(incluirHora ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
  })
    .format(fechaPedido)
    .replace(".", "");
}

function proveedorLegible(proveedor) {
  if (proveedor?.toLowerCase().includes("mercado")) return "Mercado Pago";
  if (proveedor === "falsa") return "Pago de prueba";
  return proveedor || "Pago";
}

function pasosEntrega(pedido) {
  const etapas = [
    { estado: "PENDIENTE", titulo: "Pedido recibido" },
    { estado: "PREPARANDO", titulo: "En preparación" },
    pedido.modalidad === "RETIRO"
      ? { estado: "LISTO_PARA_RETIRO", titulo: "Listo para retirar" }
      : { estado: "ENVIADO", titulo: "En camino" },
    { estado: "ENTREGADO", titulo: "Entregado" },
  ];
  if (pedido.estado === "CANCELADO") {
    return [etapas[0], { estado: "CANCELADO", titulo: "Pedido cancelado" }];
  }
  return etapas;
}

// El detalle se vuelve a consultar por id: no depende de que el listado esté
// montado y la API vuelve a comprobar que el pedido pertenece a la sesión.
function DetallePedido() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { agregarAlCarrito, mostrarAviso } = useCarritoContext();
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;

    obtenerPedidoCuenta(id)
      .then((detalle) => {
        if (vigente) setPedido(detalle);
      })
      .catch((errorSolicitud) => {
        if (vigente) setError(errorSolicitud.message || "No pudimos cargar este pedido.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [id]);

  const hitos = useMemo(() => {
    if (!pedido) return [];
    const porEstado = new Map(pedido.eventos.map((evento) => [evento.estado, evento]));
    const pagoAprobado = pedido.pagos.find((pago) => pago.estado === "APROBADO");
    const etapas = pasosEntrega(pedido).map((etapa) => ({
      ...etapa,
      evento: porEstado.get(etapa.estado),
      actual: etapa.estado === pedido.estado,
    }));

    if (pagoAprobado) {
      etapas.splice(1, 0, {
        estado: "PAGO_APROBADO",
        titulo: "Pago confirmado",
        evento: { createdAt: pagoAprobado.updatedAt ?? pagoAprobado.createdAt, nota: proveedorLegible(pagoAprobado.proveedor) },
        actual: false,
      });
    }
    return etapas;
  }, [pedido]);

  const repetirPedido = () => {
    const productosDisponibles = pedido.items.filter((item) => item.productoActual?.stock > 0);
    if (productosDisponibles.length === 0) {
      mostrarAviso("Los productos de este pedido ya no están disponibles.", null, "advertencia");
      return;
    }

    productosDisponibles.forEach((item) => {
      agregarAlCarrito(item.productoActual, item.cantidad);
    });
    mostrarAviso(
      `${productosDisponibles.length} ${productosDisponibles.length === 1 ? "producto se agregó" : "productos se agregaron"} al carrito`,
    );
    navegar("/");
  };

  return (
    <section className={styles.pantalla} aria-labelledby="titulo-pedido">
      <header className={styles.cabecera}>
        <Link to="/" className={styles.logo}>Sumarket<em>Express</em></Link>
      </header>

      <div className={styles.cuerpo}>
        <aside className={styles.navegacion} aria-label="Secciones de mi cuenta">
          <Link to="/mi-cuenta">Resumen</Link>
          <Link className={styles.navActiva} to="/mi-cuenta/pedidos">Mis pedidos</Link>
          <Link to="/mi-cuenta#direcciones">Direcciones</Link>
          <Link to="/mi-cuenta/datos">Datos y seguridad</Link>
        </aside>

        <main className={styles.contenidoPedido}>
          {cargando && <p className={styles.estado}>Cargando pedido…</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {!cargando && !error && pedido && (
            <>
              <div className={styles.cabeceraPedido}>
                <div>
                  <p className={styles.identificador}>#SE-{pedido.numero} <span aria-hidden="true">·</span> {formatearFecha(pedido.createdAt)}</p>
                  <h1 id="titulo-pedido">{TITULOS_ESTADO[pedido.estado] ?? "Detalle del pedido"}</h1>
                </div>
                <span className={`${styles.estadoPedido} ${styles[`estado${pedido.estado}`] || ""}`}>{ETIQUETAS_ESTADO[pedido.estado] ?? pedido.estado}</span>
              </div>

              <ol className={styles.lineaTiempo} aria-label="Estado de tu pedido">
                {hitos.map((hito, indice) => (
                  <li key={hito.estado} className={`${styles.hito} ${hito.evento ? styles.hitoCompletado : ""} ${hito.actual ? styles.hitoActual : ""}`}>
                    <span className={styles.punto} aria-hidden="true" />
                    {indice < hitos.length - 1 && <span className={styles.linea} aria-hidden="true" />}
                    <div>
                      <strong>{hito.titulo}</strong>
                      {hito.evento && (
                        <p>{hito.evento.nota || formatearFecha(hito.evento.createdAt, true)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              <section className={styles.productosPedido} aria-label="Productos comprados">
                {pedido.items.map((item) => (
                  <article key={`${item.sku}-${item.nombre}`} className={styles.itemPedido}>
                    {item.productoActual?.imagen && (
                      <span className={styles.imagenProducto}>
                        <ImagenProducto src={item.productoActual.imagen} alt={item.nombre} className={styles.imagenProductoReal} />
                      </span>
                    )}
                    <div className={styles.infoProducto}>
                      <p>{item.nombre} × {item.cantidad}</p>
                      <span>{formatearCLP(item.precioFinal)} c/u</span>
                    </div>
                    <strong>{formatearCLP(item.subtotal)}</strong>
                  </article>
                ))}
              </section>

              <section className={styles.totales} aria-label="Resumen de cobro">
                <p><span>Subtotal</span><span>{formatearCLP(pedido.subtotal)}</span></p>
                <p className={styles.descuento}><span>Descuento ofertas</span><span>−{formatearCLP(pedido.descuento)}</span></p>
                <p><span>Envío</span><span>{formatearCLP(pedido.costoEnvio)}</span></p>
                <p className={styles.total}><strong>Total</strong><strong>{formatearCLP(pedido.total)}</strong></p>
              </section>

              <div className={styles.acciones}>
                <button type="button" className={styles.repetir} onClick={repetirPedido}>Repetir pedido</button>
                <a href={`mailto:hola@sumarketexpress.cl?subject=${encodeURIComponent(`Ayuda con pedido #SE-${pedido.numero}`)}`} className={styles.ayuda}>Necesito ayuda</a>
              </div>
            </>
          )}
        </main>
      </div>
    </section>
  );
}

export default DetallePedido;
