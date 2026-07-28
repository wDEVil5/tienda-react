import { useLayoutEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import ImagenProducto from "../components/ImagenProducto.jsx";
import TarjetaProducto from "../components/TarjetaProducto.jsx";
import styles from "./ProductoDetalle.module.css";

// Límite de presentación. El backend y el panel admin deberán validar el
// mismo máximo al guardar imágenes; el frontend se protege por si recibe más.
const MAXIMO_IMAGENES_PRODUCTO = 5;

function ProductoDetalle({ productos }) {
  // useParams lee las partes variables de la URL. El :id de /producto/:id
  // llega SIEMPRE como string, por eso lo convertimos con Number() para comparar.
  const { id } = useParams();
  const { agregarAlCarrito } = useCarritoContext();
  const [cantidad, setCantidad] = useState(1); // cantidad a agregar
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  const producto = productos.find((p) => p.id === Number(id));

  // React Router conserva la posición previa del documento al cambiar de ruta.
  // Cada detalle debe comenzar arriba, también al abrir un relacionado desde
  // esta misma página (en ese caso el componente no se desmonta: solo cambia :id).
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // La URL podría apuntar a un id que no existe (link viejo, id inventado).
  if (!producto) {
    return (
      <section className={styles.noEncontrado}>
        <p>No encontramos ese producto.</p>
        <Link to="/" className={styles.volver}>
          ← Volver al catálogo
        </Link>
      </section>
    );
  }

  const enOferta = producto.precioAnterior !== null;
  const descuento = enOferta
    ? Math.round((1 - producto.precio / producto.precioAnterior) * 100)
    : 0;
  const ahorro = enOferta ? producto.precioAnterior - producto.precio : 0;

  // Relacionados: misma categoría, sin incluir el actual, hasta 4.
  const relacionados = productos
    .filter((p) => p.categoria === producto.categoria && p.id !== producto.id)
    .slice(0, 4);

  // Compatibilidad con productos antiguos: si aún no llega `imagenes`, usamos
  // la imagen principal. Al integrar backend se reciben hasta 5 URLs aquí.
  const imagenes = (producto.imagenes?.length ? producto.imagenes : [producto.imagen])
    .filter(Boolean)
    .slice(0, MAXIMO_IMAGENES_PRODUCTO);
  const imagenActiva = imagenes.includes(imagenSeleccionada)
    ? imagenSeleccionada
    : imagenes[0];

  return (
    <section key={id} className={styles.detalle}>
      <div className={styles.topBar}>
        <nav className={styles.miga} aria-label="Ruta de navegación">
          <Link to="/">Tienda</Link>
          <span aria-hidden="true">/</span>
          <span className={styles.migaCat}>{producto.categoria}</span>
          <span aria-hidden="true">/</span>
          <span className={styles.migaActual}>{producto.nombre}</span>
        </nav>

        <Link to="/" className={styles.volver}>
          ← Volver al catálogo
        </Link>
      </div>

      <div className={styles.contenido}>
        {/* Columna izquierda: imagen. Una sola foto por ahora; la galería de
            miniaturas del handoff requiere varias imágenes (backend, Fase 2). */}
        <div className={styles.galeria}>
          <div className={styles.imagenWrap}>
            <ImagenProducto
              className={styles.imagen}
              src={imagenActiva}
              alt={producto.nombre}
            />
            {enOferta && <span className={styles.badge}>−{descuento}%</span>}
          </div>

          {/* Fake Store muestra una sola miniatura. El backend podrá enviar
              imágenes adicionales y el usuario podrá seleccionar cualquiera. */}
          <div className={styles.miniaturas} aria-label="Imágenes del producto">
            {imagenes.map((imagen, indice) => (
              <button
                key={`${imagen}-${indice}`}
                type="button"
                className={`${styles.miniatura} ${imagenActiva === imagen ? styles.miniaturaActiva : ""}`}
                onClick={() => setImagenSeleccionada(imagen)}
                aria-pressed={imagenActiva === imagen}
                aria-label={`Ver imagen ${indice + 1} de ${producto.nombre}`}
              >
                <ImagenProducto
                  className={styles.miniaturaImagen}
                  src={imagen}
                  alt=""
                />
              </button>
            ))}
          </div>
        </div>

        {/* Columna derecha: info */}
        <div className={styles.info}>
          <p className={styles.eyebrow}>
            {producto.categoria} · SKU {producto.id}
          </p>
          <h1 className={styles.nombre}>{producto.nombre}</h1>

          <div className={styles.precios}>
            <span className={styles.precio}>
              ${producto.precio.toLocaleString("es-CL")}
            </span>
            {enOferta && (
              <>
                <span className={styles.precioAntes}>
                  ${producto.precioAnterior.toLocaleString("es-CL")}
                </span>
                <span className={styles.ahorro}>
                  Ahorras ${ahorro.toLocaleString("es-CL")}
                </span>
              </>
            )}
          </div>

          {/* Stock estático por ahora; será dato real con el backend (Fase 2). */}
          <p className={styles.stock}>
            <span className={styles.punto} aria-hidden="true"></span>
            En stock
          </p>

          <div className={styles.compra}>
            <div className={styles.cantidad}>
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                aria-label="Quitar una unidad"
              >
                −
              </button>
              <span aria-live="polite">{cantidad}</span>
              <button
                type="button"
                onClick={() => setCantidad((c) => c + 1)}
                aria-label="Agregar una unidad"
              >
                +
              </button>
            </div>

            <button
              className={styles.boton}
              onClick={() => agregarAlCarrito(producto, cantidad)}
            >
              Agregar al carrito
            </button>
          </div>

          <div className={styles.infoBox}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Retiro hoy</span>
              <span>Gratis en tienda, listo en ~2 h</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Despacho</span>
              <span>$2.990 · gratis sobre $20.000</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Devolución</span>
              <span>Hasta 30 días</span>
            </div>
          </div>

          <section className={styles.descripcionBloque} aria-labelledby="descripcion-titulo">
            <h2 id="descripcion-titulo" className={styles.descripcionTitulo}>
              Descripción
            </h2>
            <p className={styles.descripcion}>{producto.descripcion}</p>
          </section>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className={styles.relacionados}>
          <h2 className={styles.relTitulo}>También te puede interesar</h2>
          <div className={styles.relGrid}>
            {relacionados.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

export default ProductoDetalle;
