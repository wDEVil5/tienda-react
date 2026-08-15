import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Carrito.module.css";
import ImagenProducto from "./ImagenProducto.jsx";
import ControlCantidad from "./ControlCantidad.jsx";
import Toast from "./Toast.jsx";
import BarraEnvioGratis from "./BarraEnvioGratis.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { useReglas } from "../context/ReglasContext.jsx";

function Carrito({ onCerrar, abierto, productos }) {
  const {
    carrito,
    totalItems,
    eliminarDelCarrito,
    cambiarCantidad,
    fijarCantidad,
    vaciarCarrito,
  } = useCarritoContext();

  const navegar = useNavigate();
  const { envioGratisDesde } = useReglas();

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

      {/* Barra de incentivo: cuánto falta para el despacho gratis. Usa el
          subtotal a precio normal (subtotalOriginal), igual que la regla del
          servidor. Solo con ítems en el carrito. */}
      {carrito.length > 0 && (
        <BarraEnvioGratis
          subtotal={subtotalOriginal}
          umbral={envioGratisDesde}
        />
      )}

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
              <Link className={styles.vacioBotonPrimario} to="/ofertas" onClick={onCerrar}>
                Ver ofertas
              </Link>
              <Link className={styles.vacioBotonSecundario} to="/catalogo" onClick={onCerrar}>
                Ir al catálogo
              </Link>
            </div>
          </div>
        ) : (
          carrito.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.imagenWrap}>
                <Link to={`/producto/${item.slug ?? item.id}`} onClick={onCerrar}>
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
                    to={`/producto/${item.slug ?? item.id}`}
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
                      {"$\u202F"}{item.precioAnterior.toLocaleString("es-CL")}
                    </span>
                  )}
                  <span>{"$\u202F"}{item.precio.toLocaleString("es-CL")} c/u</span>
                </span>

                <div className={styles.filaInferior}>
                  <ControlCantidad
                    cantidad={item.cantidad}
                    onDisminuir={() => cambiarCantidad(item.id, -1)}
                    onAumentar={() => cambiarCantidad(item.id, 1)}
                    onFijar={(n) => fijarCantidad(item.id, n)}
                    puedeAumentar={
                      !Number.isInteger(item.stock) || item.cantidad < item.stock
                    }
                  />
                  <span className={styles.subtotal}>
                    {"$\u202F"}{(item.precio * item.cantidad).toLocaleString("es-CL")}
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
                {"$\u202F"}{(hayDescuento ? subtotalOriginal : total).toLocaleString(
                  "es-CL",
                )}
              </span>
            </div>
            {hayDescuento && (
              <div className={styles.filaResumen}>
                <span>Descuento</span>
                <span className={styles.descuento}>
                  −{"$\u202F"}{descuento.toLocaleString("es-CL")}
                </span>
              </div>
            )}
            <div className={styles.filaResumen}>
              <span>Envío</span>
              {/* Sin modalidad elegida aún: solo afirmamos "Gratis" cuando el
                  subtotal ya supera el umbral (coincide con la barra de arriba);
                  si no, el costo real se decide en el checkout. */}
              {subtotalOriginal >= envioGratisDesde ? (
                <span className={styles.envioGratis}>Gratis</span>
              ) : (
                <span>Se calcula al pagar</span>
              )}
            </div>
          </div>

          <div className={styles.total}>
            <span>Total</span>
            <span className={styles.totalMonto}>
              {"$\u202F"}{total.toLocaleString("es-CL")}
            </span>
          </div>

          {/* Lleva al checkout (contacto → entrega → confirmación) cerrando el
              drawer. El pago con pasarela llega en la Fase 4. */}
          <button
            className={styles.pagar}
            onClick={() => {
              onCerrar();
              navegar("/checkout");
            }}
          >
            Ir a pagar
          </button>

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
