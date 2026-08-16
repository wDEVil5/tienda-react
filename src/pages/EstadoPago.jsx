import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCuenta } from "../context/CuentaContext.jsx";
import { obtenerCheckoutPendiente } from "../services/checkoutPendiente.js";
import { obtenerEstadoPago } from "../services/pagosApi.js";
import styles from "./EstadoPago.module.css";

const clp = (monto) => `$\u202F${Number(monto ?? 0).toLocaleString("es-CL")}`;
const INTERVALO_CONSULTA_MS = 2000;

// El retorno de MP incluye external_reference (nuestro pagoId). Solo se usa
// como respaldo si la pasarela vuelve en otra pestaña y sessionStorage no viaja;
// la API —actualizada por webhook— sigue siendo quien decide qué se muestra.
function EstadoPago() {
  const { estaAutenticado } = useCuenta();
  const [parametros] = useSearchParams();
  const pendiente = obtenerCheckoutPendiente();
  const pagoIdRetorno = parametros.get("external_reference");
  const pagoId = pagoIdRetorno ?? pendiente?.pagoId;
  const [estado, setEstado] = useState(() => ({
    tipo: pagoId ? "cargando" : "ausente",
    pago: null,
    error: "",
  }));

  useEffect(() => {
    if (!pagoId) return undefined;

    let vigente = true;
    let temporizador;

    const consultar = async () => {
      try {
        const pago = await obtenerEstadoPago({ pagoId });
        if (!vigente) return;

        if (pago.estado === "APROBADO") {
          setEstado({ tipo: "aprobado", pago, error: "" });
          return;
        }
        if (pago.estado === "RECHAZADO") {
          setEstado({ tipo: "rechazado", pago, error: "" });
          return;
        }

        setEstado({ tipo: "pendiente", pago, error: "" });
        temporizador = window.setTimeout(consultar, INTERVALO_CONSULTA_MS);
      } catch (error) {
        if (vigente) setEstado({ tipo: "error", pago: null, error: error.message });
      }
    };

    consultar();
    return () => {
      vigente = false;
      window.clearTimeout(temporizador);
    };
  }, [pagoId]);

  if (estado.tipo === "cargando" || estado.tipo === "pendiente") {
    return <PagoProcesando />;
  }

  if (estado.tipo === "aprobado") {
    return <PagoAprobado pago={estado.pago} estaAutenticado={estaAutenticado} />;
  }

  if (estado.tipo === "rechazado") {
    return <PagoRechazado pago={estado.pago} estaAutenticado={estaAutenticado} />;
  }

  return (
    <EstadoBase>
      <span className={`${styles.iconoEstado} ${styles.iconoError}`} aria-hidden="true"><i className="fa-solid fa-exclamation" /></span>
      <h1>No pudimos comprobar el pago</h1>
      <p>{estado.tipo === "ausente" ? "No encontramos un pago pendiente en este navegador." : estado.error}</p>
      <Link to="/checkout" className={styles.botonPrimario}>Volver al checkout</Link>
    </EstadoBase>
  );
}

function EstadoBase({ children }) {
  return (
    <section className={styles.pantalla}>
      <Link to="/" className={styles.logo} aria-label="Volver a la tienda">
        <span aria-hidden="true">←</span> Volver a la tienda
      </Link>
      <div className={styles.contenido}>{children}</div>
    </section>
  );
}

function PagoProcesando() {
  return (
    <EstadoBase>
      <span className={`${styles.iconoEstado} ${styles.iconoPendiente}`} aria-hidden="true">−</span>
      <h1>Procesando tu pago</h1>
      <p>Esperamos la confirmación de la pasarela. Esta pantalla se actualizará cuando Mercado Pago confirme el resultado.</p>
      <span className={styles.progreso} aria-label="Esperando confirmación" />
    </EstadoBase>
  );
}

function PagoAprobado({ pago, estaAutenticado }) {
  const { pedido } = pago;
  const entrega = pedido.modalidad === "DESPACHO"
    ? `Despacho a ${pedido.dirComuna ?? "tu dirección"}`
    : "Retiro en tienda";

  return (
    <EstadoBase>
      <span className={`${styles.iconoEstado} ${styles.iconoExito}`} aria-hidden="true"><i className="fa-solid fa-check" /></span>
      <h1>¡Gracias por tu compra!</h1>
      <p>Pago confirmado por webhook. Te enviamos el detalle a <strong>{pedido.contactoEmail}</strong>.</p>
      <dl className={styles.resumenPedido}>
        <div><dt>Pedido</dt><dd>#SE-{pedido.numero}</dd></div>
        <div><dt>Estado</dt><dd><span className={styles.etiquetaPagada}>Pagada</span></dd></div>
        <div><dt>Entrega</dt><dd>{entrega}</dd></div>
        <div><dt>Pagaste con</dt><dd>Mercado Pago</dd></div>
        <div className={styles.total}><dt>Total</dt><dd>{clp(pedido.total)}</dd></div>
      </dl>
      <div className={styles.acciones}>
        {estaAutenticado && <Link to={`/mi-cuenta/pedidos/${pedido.id}`} className={styles.botonOscuro}>Seguir el pedido</Link>}
        <Link to="/" className={styles.botonSecundario}>Seguir comprando</Link>
      </div>
    </EstadoBase>
  );
}

function PagoRechazado({ pago, estaAutenticado }) {
  const navegar = useNavigate();

  return (
    <EstadoBase>
      <span className={`${styles.iconoEstado} ${styles.iconoError}`} aria-hidden="true"><i className="fa-solid fa-exclamation" /></span>
      <h1>El pago fue rechazado</h1>
      <p>La pasarela no confirmó el cobro. Tu pedido sigue pendiente y podrás intentar pagarlo nuevamente.</p>
      <div className={styles.acciones}>
        <button type="button" className={styles.botonOscuro} onClick={() => navegar("/checkout/pago", { replace: true })}>Probar nuevamente</button>
        {estaAutenticado && <Link to={`/mi-cuenta/pedidos/${pago.pedido.id}`} className={styles.botonSecundario}>Ver el pedido</Link>}
      </div>
    </EstadoBase>
  );
}

export default EstadoPago;
