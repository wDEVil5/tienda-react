import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./Carrito.module.css";
import ImagenProducto from "./ImagenProducto.jsx";
import ControlCantidad from "./ControlCantidad.jsx";
import Toast from "./Toast.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";

function Carrito({ onCerrar, abierto, productos, onVerOfertas, onVerCatalogo }) {
  const {
    carrito,
    totalItems,
    eliminarDelCarrito,
    cambiarCantidad,
    fijarCantidad,
    vaciarCarrito,
  } = useCarritoContext();

  // Refs: cajas que persisten entre renders sin causar re-render.
  const drawerRef = useRef(null); // handle al <aside> del DOM
  const elementoPrevioRef = useRef(null); // quién tenía el foco antes de abrir

  // solo cuando el carrito está ABIERTO, escuchamos la tecla Escape
  // (evento del navegador -> vive fuera de React) y congelamos el scroll del
  // fondo para que no se mueva la página detrás del drawer.
  useEffect(() => {
    if (!abierto) return;

    const manejarTecla = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", manejarTecla);
    document.body.style.overflow = "hidden";

    // Cleanup: React lo ejecuta al cerrar el carrito o al desmontar. Si abrimos
    // otra cosa (un listener, un estilo), lo cerramos aquí mismo. Sin esto quedarían
    // listeners zombis y el scroll se bloquearia.
    return () => {
      window.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = "";
    };
  }, [abierto, onCerrar]);

  // Manejo de foco (diálogo accesible): al abrir, recordamos quién tenía el foco
  // y lo movemos DENTRO del carrito; al cerrar, se lo devolvemos. Mientras está
  // abierto, atrapamos el Tab para que el foco no se escape al fondo (focus trap).
  useEffect(() => {
    if (!abierto) return;

    const drawer = drawerRef.current;
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    elementoPrevioRef.current = document.activeElement;
    drawer.querySelector(selector)?.focus(); // foco al primer elemento

    const atraparTab = (e) => {
      if (e.key !== "Tab") return;
      // Recalculamos en cada Tab: el contenido del carrito puede cambiar.
      const focusables = drawer.querySelectorAll(selector);
      if (focusables.length === 0) return;

      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus(); // Shift+Tab en el primero → salta al último
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus(); // Tab en el último → vuelve al primero
      }
    };
    drawer.addEventListener("keydown", atraparTab);

    return () => {
      drawer.removeEventListener("keydown", atraparTab);
      elementoPrevioRef.current?.focus(); // devolvemos el foco al abridor
    };
  }, [abierto]);

  const total = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0,
  );

  // Subtotal a precios ORIGINALES (usa precioAnterior si el ítem está en oferta).
  // El descuento es lo que se ahorra; solo lo mostramos si es mayor que 0.
  const subtotalOriginal = carrito.reduce(
    (suma, item) => suma + (item.precioAnterior ?? item.precio) * item.cantidad,
    0,
  );
  const descuento = subtotalOriginal - total;
  const hayDescuento = descuento > 0;
  // La tarjeta vacía deriva cantidad y porcentaje desde el catálogo actual;
  // al reemplazar Fake Store por el backend propio no necesita texto manual.
  const ofertas = productos.filter(
    (producto) => typeof producto.precioAnterior === "number",
  );
  const cantidadOfertas = ofertas.length;
  const descuentoMaximo = cantidadOfertas
    ? Math.max(
        ...ofertas.map((producto) =>
          Math.round((1 - producto.precio / producto.precioAnterior) * 100),
        ),
      )
    : null;

  return (
    <aside
      ref={drawerRef}
      className={`${styles.carrito} ${abierto ? styles.abierto : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="carrito-titulo"
      inert={!abierto}
    >
      {/* Zona 1: cabecera */}
      <div className={styles.cabecera}>
        <h2 id="carrito-titulo" className={styles.titulo}>
          Tu carrito{totalItems > 0 && ` (${totalItems})`}
        </h2>
        <button className={styles.cerrar} onClick={onCerrar}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Zona 2: lista scrolleable */}
      <div className={styles.lista}>
        {carrito.length === 0 ? (
          <div className={styles.vacio}>
            <i className={`fa-solid fa-cart-shopping ${styles.vacioIcono}`}></i>
            <p className={styles.vacioTexto}>Tu carrito está vacío</p>
            <p className={styles.vacioSub}>
              {cantidadOfertas > 0
                ? `Parte por las ofertas: ${cantidadOfertas} productos con hasta ${descuentoMaximo}% de descuento esta semana.`
                : "Explora el catálogo y encuentra productos para tu carrito."}
            </p>
            <div className={styles.vacioAcciones}>
              <Link
                className={styles.vacioBotonPrimario}
                to="/#catalogo"
                onClick={() => {
                  onVerOfertas();
                  onCerrar();
                }}
              >
                Ver ofertas
              </Link>
              <Link
                className={styles.vacioBotonSecundario}
                to="/#catalogo"
                onClick={() => {
                  onVerCatalogo();
                  onCerrar();
                }}
              >
                Ir al catálogo
              </Link>
            </div>
          </div>
        ) : (
          carrito.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.imagenWrap}>
                <Link to={`/producto/${item.id}`} onClick={onCerrar}>
                  <ImagenProducto
                    className={styles.imagen}
                    src={item.imagen}
                    alt={item.nombre}
                  />
                </Link>
              </div>

              <div className={styles.info}>
                <div className={styles.filaSuperior}>
                  <Link
                    to={`/producto/${item.id}`}
                    onClick={onCerrar}
                    className={styles.itemNombre}
                  >
                    {item.nombre}
                  </Link>
                  {/* Boton eliminar */}
                  <button
                    className={styles.eliminar}
                    onClick={() => eliminarDelCarrito(item.id)}
                    aria-label={`Eliminar ${item.nombre}`}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </div>

                <span className={styles.precioUnitario}>
  {typeof item.precioAnterior === "number" && (
                    <span className={styles.precioAntes}>
                      ${item.precioAnterior.toLocaleString("es-CL")}
                    </span>
                  )}
                  <span>${item.precio.toLocaleString("es-CL")} c/u</span>
                </span>

                <div className={styles.filaInferior}>
                  <ControlCantidad
                    cantidad={item.cantidad}
                    onDisminuir={() => cambiarCantidad(item.id, -1)}
                    onAumentar={() => cambiarCantidad(item.id, 1)}
                    onFijar={(n) => fijarCantidad(item.id, n)}
                  />
                  <span className={styles.subtotal}>
                    ${(item.precio * item.cantidad).toLocaleString("es-CL")}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dentro del drawer el aviso queda entre la lista y el resumen: no tapa
          controles y el usuario puede deshacer sin abandonar el carrito. */}
      {abierto && <Toast ubicacion="carrito" soloAccion />}

      {/* Zona 3: total + acciones fijo (solo si hay items) */}
      {carrito.length > 0 && (
        <div className={styles.pie}>
          <div className={styles.resumen}>
            <div className={styles.filaResumen}>
              <span>Subtotal</span>
              <span>
                ${(hayDescuento ? subtotalOriginal : total).toLocaleString(
                  "es-CL",
                )}
              </span>
            </div>
            {hayDescuento && (
              <div className={styles.filaResumen}>
                <span>Descuento</span>
                <span className={styles.descuento}>
                  −${descuento.toLocaleString("es-CL")}
                </span>
              </div>
            )}
            <div className={styles.filaResumen}>
              <span>Envío</span>
              <span className={styles.envioGratis}>Gratis</span>
            </div>
          </div>

          <div className={styles.total}>
            <span>Total</span>
            <span className={styles.totalMonto}>
              ${total.toLocaleString("es-CL")}
            </span>
          </div>

          {/* CTA principal. El checkout real lo hare en la Fase 4 (pagos). */}
          <button className={styles.pagar}>Ir a pagar</button>

          <div className={styles.accionesSec}>
            <button className={styles.seguir} onClick={onCerrar}>
              Seguir comprando
            </button>
            {/* Acción destructiva: confirmamos antes de borrar todo. */}
            <button
              className={styles.vaciar}
              onClick={() => {
                if (window.confirm("¿Vaciar todo el carrito?")) {
                  vaciarCarrito();
                }
              }}
            >
              Vaciar carrito
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Carrito;
