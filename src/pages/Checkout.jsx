import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Checkout.module.css";
import ImagenProducto from "../components/ImagenProducto.jsx";
import BarraEnvioGratis from "../components/BarraEnvioGratis.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { useReglas } from "../context/ReglasContext.jsx";
import {
  cotizarPedido,
  crearPedido,
  hayApiPedidos,
} from "../services/pedidosApi.js";

// Espacio fino inseparable: separa el símbolo de la cifra sin permitir que se
// partan en dos líneas dentro de los resúmenes angostos.
const clp = (n) => `$\u202F${(n ?? 0).toLocaleString("es-CL")}`;

// Comunas con tarifa conocida (espejo de reglasTienda.js). Es solo una ayuda de
// autocompletado: el costo real y la validación siempre los decide el servidor.
const COMUNAS_SUGERIDAS = ["Providencia", "Ñuñoa", "Las Condes", "Maipú"];

const CONTACTO_INICIAL = { nombre: "", email: "", telefono: "" };
const DIRECCION_INICIAL = {
  calle: "",
  depto: "",
  comuna: "",
  region: "Región Metropolitana",
  instrucciones: "",
};

function Checkout() {
  const { carrito, vaciarCarrito } = useCarritoContext();
  const { envioGratisDesde } = useReglas();
  const navegar = useNavigate();

  const [contacto, setContacto] = useState(CONTACTO_INICIAL);
  const [modalidad, setModalidad] = useState("DESPACHO");
  const [direccion, setDireccion] = useState(DIRECCION_INICIAL);

  // Cotización del servidor (fuente de verdad de los montos). Mientras no llega
  // —o en la demo sin API— mostramos una estimación local claramente marcada.
  const [cotizacion, setCotizacion] = useState(null);
  const [cotizando, setCotizando] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

  const conApi = hayApiPedidos();

  // El cliente manda QUÉ compra; el precio lo pone el servidor. Por eso al API
  // solo le enviamos productoId + cantidad.
  const items = useMemo(
    () => carrito.map((item) => ({ productoId: item.id, cantidad: item.cantidad })),
    [carrito],
  );

  // Estimación local: subtotal a precios normales y el ahorro. No conoce el
  // envío (eso depende de reglas del servidor), así que lo dejamos "por calcular".
  const estimado = useMemo(() => {
    const subtotal = carrito.reduce(
      (suma, item) => suma + (item.precioAnterior ?? item.precio) * item.cantidad,
      0,
    );
    const neto = carrito.reduce(
      (suma, item) => suma + item.precio * item.cantidad,
      0,
    );
    return { subtotal, descuento: subtotal - neto, neto };
  }, [carrito]);

  const comunaLimpia = direccion.comuna.trim();

  // Resumen live: cotiza al cambiar modalidad/comuna. Debounce 300 ms para no
  // pedir por cada tecla de la comuna. Todos los setState viven en callbacks
  // asíncronos (timeout/then), nunca en el cuerpo del effect.
  useEffect(() => {
    if (!conApi || carrito.length === 0) return undefined;

    let vigente = true;
    const temporizador = window.setTimeout(() => {
      // Despacho sin comuna válida aún: no cotizamos, caemos a la estimación.
      if (modalidad === "DESPACHO" && comunaLimpia.length < 2) {
        setCotizacion(null);
        return;
      }

      setCotizando(true);
      cotizarPedido({
        modalidad,
        comuna: modalidad === "DESPACHO" ? comunaLimpia : undefined,
        items,
      })
        .then((datos) => {
          if (vigente) setCotizacion(datos);
        })
        .catch(() => {
          if (vigente) setCotizacion(null);
        })
        .finally(() => {
          if (vigente) setCotizando(false);
        });
    }, 300);

    return () => {
      vigente = false;
      window.clearTimeout(temporizador);
    };
  }, [conApi, modalidad, comunaLimpia, items, carrito.length]);

  // Lo mostrado: la cotización del servidor si existe; si no, la estimación.
  const resumen = cotizacion ?? {
    subtotal: estimado.subtotal,
    descuento: estimado.descuento,
    costoEnvio: null,
    total: estimado.neto,
  };
  const montosEstimados = cotizacion === null;

  const envioTexto =
    resumen.costoEnvio === 0
      ? "Gratis"
      : typeof resumen.costoEnvio === "number"
        ? clp(resumen.costoEnvio)
        : modalidad === "RETIRO"
          ? "Gratis"
          : "Por calcular";

  const contactoCompleto =
    contacto.nombre.trim().length >= 2 &&
    /.+@.+\..+/.test(contacto.email.trim()) &&
    contacto.telefono.trim().length >= 6;

  const direccionCompleta =
    modalidad === "RETIRO" ||
    (direccion.calle.trim().length >= 3 &&
      comunaLimpia.length >= 2 &&
      direccion.region.trim().length >= 2);

  const puedeEnviar =
    conApi && contactoCompleto && direccionCompleta && !enviando;

  const cambiarContacto = (campo) => (evento) =>
    setContacto((previo) => ({ ...previo, [campo]: evento.target.value }));

  const cambiarDireccion = (campo) => (evento) =>
    setDireccion((previo) => ({ ...previo, [campo]: evento.target.value }));

  async function manejarEnvio(evento) {
    evento.preventDefault();
    if (!puedeEnviar) return;

    setEnviando(true);
    setErrorEnvio(null);

    // Construimos la dirección solo para despacho, omitiendo los opcionales
    // vacíos: el esquema del backend es .strict() y así queda limpio.
    const direccionPedido =
      modalidad === "DESPACHO"
        ? {
            calle: direccion.calle.trim(),
            comuna: comunaLimpia,
            region: direccion.region.trim(),
            ...(direccion.depto.trim() ? { depto: direccion.depto.trim() } : {}),
            ...(direccion.instrucciones.trim()
              ? { instrucciones: direccion.instrucciones.trim() }
              : {}),
          }
        : undefined;

    try {
      const pedido = await crearPedido({
        contacto: {
          nombre: contacto.nombre.trim(),
          email: contacto.email.trim(),
          telefono: contacto.telefono.trim(),
        },
        modalidad,
        direccion: direccionPedido,
        items,
      });

      setPedidoConfirmado(pedido);
      vaciarCarrito(); // el pedido ya vive en el servidor; liberamos el carrito
    } catch (error) {
      setErrorEnvio(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  // --- Confirmación (va ANTES del guard de carrito vacío: vaciamos al crear) ---
  if (pedidoConfirmado) {
    return (
      <section className={styles.checkout}>
        <CabeceraCheckout pasoActual={3} />
        <div className={styles.confirmacion}>
          <span className={styles.check} aria-hidden="true">
            <i className="fa-solid fa-check"></i>
          </span>
          <h1 className={styles.confTitulo}>Recibimos tu pedido</h1>
          <p className={styles.confSub}>
            Te enviaremos el detalle a{" "}
            <strong>{pedidoConfirmado.contacto?.email}</strong>.
          </p>

          <dl className={styles.confFicha}>
            <div className={styles.confFila}>
              <dt>Pedido</dt>
              <dd className={styles.confNumero}>
                #SE-{pedidoConfirmado.numero}
              </dd>
            </div>
            <div className={styles.confFila}>
              <dt>Entrega</dt>
              <dd>
                {pedidoConfirmado.modalidad === "DESPACHO"
                  ? `Despacho a ${pedidoConfirmado.direccion?.comuna ?? ""}`
                  : "Retiro en tienda"}
              </dd>
            </div>
            <div className={styles.confFila}>
              <dt>Total</dt>
              <dd className={styles.confTotal}>{clp(pedidoConfirmado.total)}</dd>
            </div>
          </dl>

          <div className={styles.confAcciones}>
            <button
              className={styles.confBotonPrimario}
              onClick={() => navegar("/")}
            >
              Volver al inicio
            </button>
          </div>
          <p className={styles.confNota}>
            El pedido quedó pendiente de confirmación. El pago en línea llegará en
            una etapa posterior.
          </p>
        </div>
      </section>
    );
  }

  // --- Carrito vacío ---
  if (carrito.length === 0) {
    return (
      <section className={styles.checkout}>
        <CabeceraCheckout pasoActual={1} />
        <h1 className={styles.titulo}>Finalizar compra</h1>
        <p className={styles.vacio}>Tu carrito está vacío.</p>
        <Link to="/#catalogo" className={styles.volver}>
          Ir al catálogo
        </Link>
      </section>
    );
  }

  // --- Formulario + resumen ---
  return (
    <section className={styles.checkout}>
      <CabeceraCheckout pasoActual={1} />

      {!conApi && (
        <p className={styles.aviso}>
          El envío de pedidos está disponible solo en el entorno local con la API
          propia; en la demo pública puedes ver el resumen, pero no confirmar la
          compra.
        </p>
      )}

      <div className={styles.layout}>
        {/* Columna izquierda: formulario */}
        <form className={styles.form} onSubmit={manejarEnvio} noValidate>
          <section className={styles.tarjeta} aria-labelledby="titulo-contacto">
            <h2 id="titulo-contacto" className={styles.tarjetaTitulo}>
              Datos de contacto
            </h2>
            <div className={styles.fila2}>
              <div className={styles.grupo}>
                <label className={styles.label} htmlFor="nombre">
                  Nombre y apellido
                </label>
                <input
                  id="nombre"
                  className={styles.input}
                  type="text"
                  autoComplete="name"
                  value={contacto.nombre}
                  onChange={cambiarContacto("nombre")}
                  required
                />
              </div>
              <div className={styles.grupo}>
                <label className={styles.label} htmlFor="telefono">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  className={styles.input}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+56 9 1234 5678"
                  value={contacto.telefono}
                  onChange={cambiarContacto("telefono")}
                  required
                />
              </div>
            </div>
            <div className={styles.grupo}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className={styles.input}
                type="email"
                autoComplete="email"
                value={contacto.email}
                onChange={cambiarContacto("email")}
                required
              />
            </div>
          </section>

          <section className={styles.tarjeta} aria-labelledby="titulo-entrega">
            <h2 id="titulo-entrega" className={styles.tarjetaTitulo}>
              Entrega
            </h2>
            <div className={styles.opciones}>
              <label
                className={`${styles.opcion} ${
                  modalidad === "DESPACHO" ? styles.opcionActiva : ""
                }`}
              >
                <input
                  type="radio"
                  name="modalidad"
                  value="DESPACHO"
                  checked={modalidad === "DESPACHO"}
                  onChange={() => setModalidad("DESPACHO")}
                />
                <span className={styles.opcionTexto}>
                  <span className={styles.opcionNombre}>Despacho a domicilio · 24–48 h</span>
                  <span className={styles.opcionDetalle}>El plazo se confirma según tu comuna</span>
                </span>
                <strong className={styles.opcionValor}>
                  {cotizando ? "…" : envioTexto}
                </strong>
              </label>
              <label
                className={`${styles.opcion} ${
                  modalidad === "RETIRO" ? styles.opcionActiva : ""
                }`}
              >
                <input
                  type="radio"
                  name="modalidad"
                  value="RETIRO"
                  checked={modalidad === "RETIRO"}
                  onChange={() => setModalidad("RETIRO")}
                />
                <span className={styles.opcionTexto}>
                  <span className={styles.opcionNombre}>Retiro en tienda · listo en ~2 h</span>
                  <span className={styles.opcionDetalle}>Av. Matta 980, Santiago</span>
                </span>
                <strong className={styles.opcionValor}>Gratis</strong>
              </label>
            </div>

            {modalidad === "DESPACHO" && (
              <div className={styles.direccion}>
                <div className={styles.grupo}>
                  <label className={styles.label} htmlFor="calle">
                    Dirección
                  </label>
                  <input
                    id="calle"
                    className={styles.input}
                    type="text"
                    autoComplete="address-line1"
                    placeholder="Av. Providencia 1234, depto 502"
                    value={direccion.calle}
                    onChange={cambiarDireccion("calle")}
                    required
                  />
                </div>
                <div className={styles.fila2}>
                  <div className={styles.grupo}>
                    <label className={styles.label} htmlFor="comuna">
                      Comuna
                    </label>
                    <select
                      id="comuna"
                      className={styles.input}
                      autoComplete="address-level2"
                      value={direccion.comuna}
                      onChange={cambiarDireccion("comuna")}
                      required
                    >
                      <option value="" disabled>Selecciona comuna</option>
                      {COMUNAS_SUGERIDAS.map((comuna) => (
                        <option key={comuna} value={comuna}>
                          {comuna}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.grupo}>
                    <label className={styles.label} htmlFor="region">
                      Región
                    </label>
                    <select
                      id="region"
                      className={styles.input}
                      autoComplete="address-level1"
                      value={direccion.region}
                      onChange={cambiarDireccion("region")}
                      required
                    >
                      <option value="Región Metropolitana">Región Metropolitana</option>
                    </select>
                  </div>
                </div>
                <div className={styles.grupo}>
                  <label className={styles.label} htmlFor="instrucciones">
                    Instrucciones para el repartidor{" "}
                    <span className={styles.opcional}>(opcional)</span>
                  </label>
                  <input
                    id="instrucciones"
                    className={styles.input}
                    type="text"
                    placeholder="Dejar en conserjería"
                    value={direccion.instrucciones}
                    onChange={cambiarDireccion("instrucciones")}
                  />
                </div>
              </div>
            )}
          </section>
        </form>

        {/* Columna derecha: resumen sticky */}
        <aside className={styles.resumen}>
          <h2 className={styles.resumenTitulo}>
            Tu pedido ({carrito.reduce((total, item) => total + item.cantidad, 0)})
          </h2>

          <div className={styles.itemsViewport}>
            <ul className={styles.items}>
              {carrito.map((item) => (
                <li key={item.id} className={styles.itemFila}>
                  <ImagenProducto
                    className={styles.itemImagen}
                    src={item.imagen}
                    alt={item.nombre}
                  />
                  <div className={styles.itemInfo}>
                    <div className={styles.itemEncabezado}>
                      <span className={styles.itemNombre} title={item.nombre}>
                        {item.nombre}
                      </span>
                      <span className={styles.itemCantidad}>× {item.cantidad}</span>
                    </div>
                    <span className={styles.itemPrecio}>
                      {clp(item.precio * item.cantidad)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Presentación del futuro cupón. No es un control interactivo hasta
              que el backend defina validación, vigencia y efecto en totales. */}
          <div
            className={styles.cupon}
            aria-label="Código de descuento, disponible próximamente"
          >
            <span>Código de descuento</span>
            <span className={styles.cuponAccion}>Aplicar</span>
          </div>

          {/* Incentivo de envío: solo en despacho (el retiro es gratis siempre).
              Usa el subtotal a precio normal, igual que la regla del servidor. */}
          {modalidad === "DESPACHO" && (
            <BarraEnvioGratis
              subtotal={resumen.subtotal}
              umbral={envioGratisDesde}
              variante="caja"
              className={styles.barraEnvio}
            />
          )}

          <div className={styles.montos}>
            <div className={styles.filaMonto}>
              <span>Subtotal</span>
              <span>{clp(resumen.subtotal)}</span>
            </div>
            {resumen.descuento > 0 && (
              <div className={styles.filaMonto}>
                <span>Descuento</span>
                <span className={styles.descuento}>
                  −{clp(resumen.descuento)}
                </span>
              </div>
            )}
            <div className={styles.filaMonto}>
              <span>Envío</span>
              <span
                className={envioTexto === "Gratis" ? styles.gratis : undefined}
              >
                {cotizando ? "Calculando…" : envioTexto}
              </span>
            </div>
          </div>

          <div className={styles.totalFila}>
            <span>Total</span>
            <span className={styles.totalMonto}>{clp(resumen.total)}</span>
          </div>

          {montosEstimados && (
            <p className={styles.notaEstimado}>
              {modalidad === "DESPACHO"
                ? "Ingresa tu comuna para calcular el envío."
                : "Montos estimados; se confirman en el servidor."}
            </p>
          )}

          {errorEnvio && (
            <p className={styles.errorEnvio} role="alert">
              {errorEnvio}
            </p>
          )}

          <button
            type="button"
            className={styles.confirmar}
            onClick={manejarEnvio}
            disabled={!puedeEnviar}
          >
            {enviando ? "Continuando…" : "Continuar al pago"}
          </button>

          <p className={styles.notaServidor}>
            Montos calculados en el servidor. El pago con pasarela llega en la
            Fase 4.
          </p>
        </aside>
      </div>
    </section>
  );
}

function CabeceraCheckout({ pasoActual }) {
  const pasos = ["Envío", "Pago", "Listo"];

  return (
    <header className={styles.cabecera}>
      <Link to="/" className={styles.logo} aria-label="Volver a Sumarket Express">
        Sumarket<em>Express</em>
      </Link>
      <ol className={styles.progreso} aria-label={`Paso ${pasoActual} de 3`}>
        {pasos.map((nombre, indice) => {
          const numero = indice + 1;
          const completado = numero < pasoActual;
          const activo = numero === pasoActual;
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

// Traduce el error de la API a un mensaje para la persona. El backend distingue
// falta de stock (409) de datos inválidos (422) mediante error.code.
function mensajeDeError(error) {
  switch (error?.code) {
    case "INSUFFICIENT_STOCK":
      return "Uno o más productos se quedaron sin stock suficiente. Ajusta las cantidades e intenta de nuevo.";
    case "PRODUCT_UNAVAILABLE":
      return "Un producto dejó de estar disponible. Revisa tu carrito.";
    case "INVALID_ORDER_DATA":
      return "Revisa los datos del formulario: algún campo quedó incompleto.";
    default:
      return error?.message ?? "No se pudo confirmar el pedido. Intenta nuevamente.";
  }
}

export default Checkout;
