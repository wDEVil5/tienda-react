import { useEffect, useLayoutEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { useCuenta } from "../context/CuentaContext.jsx";
import { useFavoritos } from "../context/FavoritosContext.jsx";
import { useAccesoModal } from "../context/AccesoModalContext.jsx";
import ImagenProducto from "../components/ImagenProducto.jsx";
import TarjetaProducto from "../components/TarjetaProducto.jsx";
import ControlCantidad from "../components/ControlCantidad.jsx";
import ResenasProducto from "../components/ResenasProducto.jsx";
import { obtenerMasVendidos, obtenerProductoDetalle, obtenerProductosSimilares } from "../services/productosApi.js";
import styles from "./ProductoDetalle.module.css";

// Límite de presentación. El backend y el panel admin deberán validar el
// mismo máximo al guardar imágenes; el frontend se protege por si recibe más.
const MAXIMO_IMAGENES_PRODUCTO = 5;

function formatearFechaProducto(fecha) {
  if (!fecha) return null;

  // La API entrega una fecha sin hora de negocio. Al construirla al mediodía
  // local evitamos que una zona horaria la presente como el día anterior.
  const fechaLocal = new Date(`${String(fecha).slice(0, 10)}T12:00:00`);
  return Number.isNaN(fechaLocal.getTime())
    ? null
    : new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(fechaLocal);
}

function ProductoDetalle({ productos }) {
  const { slug } = useParams();
  const { agregarAlCarrito, carrito } = useCarritoContext();
  const { estaAutenticado } = useCuenta();
  const { esFavorito, alternarFavorito } = useFavoritos();
  const { abrirAcceso } = useAccesoModal();
  const [cantidad, setCantidad] = useState(1); // cantidad a agregar
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  // La colección actual resuelve navegación interna. Si se abre una URL directa
  // de una página aún no cargada, el efecto consulta su ficha al backend.
  const productoLocal = productos.find(
    (productoActual) =>
      productoActual.slug === slug || String(productoActual.id) === slug,
  );
  const [detalleRemoto, setDetalleRemoto] = useState({
    slug: null,
    producto: null,
    terminado: false,
  });

  useEffect(() => {
    if (productoLocal) return undefined;

    let vigente = true;

    obtenerProductoDetalle({ slug })
      .then((producto) => {
        if (vigente) {
          setDetalleRemoto({ slug, producto, terminado: true });
        }
      })
      .catch(() => {
        if (vigente) {
          setDetalleRemoto({ slug, producto: null, terminado: true });
        }
      });

    return () => {
      vigente = false;
    };
  }, [productoLocal, slug]);

  const producto =
    productoLocal ?? (detalleRemoto.slug === slug ? detalleRemoto.producto : null);
  const cargandoProducto =
    !productoLocal &&
    (detalleRemoto.slug !== slug || !detalleRemoto.terminado);

  // "Descubre productos similares": se piden al backend por el slug del producto
  // ya resuelto. Sin API o ante un fallo la función devuelve [] y no se muestra.
  const [similares, setSimilares] = useState([]);
  useEffect(() => {
    let vigente = true;
    obtenerProductosSimilares({ slug: producto?.slug, limit: 6 })
      .then((lista) => {
        if (vigente) setSimilares(lista.filter((similar) => similar.id !== producto?.id));
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [producto?.slug, producto?.id]);

  // "Te podrían interesar": más vendidos del catálogo (recomendación popular,
  // distinta de los similares por subcategoría). Se piden una sola vez.
  const [masVendidos, setMasVendidos] = useState([]);
  useEffect(() => {
    let vigente = true;
    obtenerMasVendidos({ limit: 12 })
      .then((lista) => {
        if (vigente && Array.isArray(lista)) setMasVendidos(lista);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  // React Router conserva la posición previa del documento al cambiar de ruta.
  // Cada detalle debe comenzar arriba, también al abrir un relacionado desde
  // esta misma página (en ese caso el componente no se desmonta: solo cambia :id).
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (cargandoProducto) {
    return (
      <section className={styles.noEncontrado} role="status">
        <p>Cargando producto...</p>
      </section>
    );
  }

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

  const favorito = esFavorito(producto.id);
  // Invitado → modal de acceso en la misma página; al iniciar sesión, retoma el
  // favorito. Con sesión el toggle es optimista y el contexto revierte solo.
  const alternarFavoritoDetalle = async () => {
    if (!estaAutenticado) {
      abrirAcceso({
        mensaje: "Inicia sesión para guardar productos en tus favoritos.",
        onExito: () => alternarFavorito(producto.id).catch(() => {}),
      });
      return;
    }
    try {
      await alternarFavorito(producto.id);
    } catch {
      // El corazón ya volvió a su estado previo.
    }
  };

  const enOferta = producto.precioAnterior !== null;
  const descuento = enOferta
    ? Math.round((1 - producto.precio / producto.precioAnterior) * 100)
    : 0;
  const ahorro = enOferta ? producto.precioAnterior - producto.precio : 0;
  const stockConocido = Number.isInteger(producto.stock) && producto.stock >= 0;
  const sinStock = stockConocido && producto.stock === 0;
  const cantidadEnCarrito = carrito.find((item) => item.id === producto.id)?.cantidad ?? 0;
  const disponiblesParaAgregar = stockConocido
    ? Math.max(0, producto.stock - cantidadEnCarrito)
    : null;
  const puedeAgregar = !sinStock && (disponiblesParaAgregar === null || disponiblesParaAgregar > 0);
  const textoStock = stockConocido
    ? sinStock
      ? "Sin stock"
      : `${producto.stock} ${producto.stock === 1 ? "unidad disponible" : "unidades disponibles"}`
    : "En stock";
  const contenido =
    producto.contenidoCantidad !== null && producto.contenidoUnidad
      ? `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(
          producto.contenidoCantidad,
        )} ${producto.contenidoUnidad}`
      : null;
  const detalles = [
    { etiqueta: "Origen", valor: producto.origen },
    { etiqueta: "Contenido", valor: contenido },
    { etiqueta: "Vence", valor: formatearFechaProducto(producto.fechaVencimiento) },
  ].filter(({ valor }) => Boolean(valor));

  // Sugeridos: preferimos los similares reales del backend (misma
  // subcategoría/categoría); si la API no respondió, caemos a un derivado local
  // por categoría de la colección ya cargada.
  const relacionadosLocales = productos
    .filter((p) => p.categoria === producto.categoria && p.id !== producto.id)
    .slice(0, 6);
  const sugeridos = similares.length > 0 ? similares : relacionadosLocales;

  // "Te podrían interesar": más vendidos, excluyendo el actual y los que ya
  // aparecen en "similares" para no repetir tarjetas.
  const idsMostrados = new Set([producto.id, ...sugeridos.map((p) => p.id)]);
  const teInteresan = masVendidos.filter((p) => !idsMostrados.has(p.id)).slice(0, 6);

  // Las reseñas usan el id real (UUID) del backend. En el fallback de demo
  // (Fake Store, ids numéricos) no hay reseñas: ocultamos la sección.
  const productoTieneResenas = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(producto.id),
  );

  // Compatibilidad con productos antiguos: si aún no llega `imagenes`, usamos
  // la imagen principal. Al integrar backend se reciben hasta 5 URLs aquí.
  const imagenes = (producto.imagenes?.length ? producto.imagenes : [producto.imagen])
    .filter(Boolean)
    .slice(0, MAXIMO_IMAGENES_PRODUCTO);
  const imagenActiva = imagenes.includes(imagenSeleccionada)
    ? imagenSeleccionada
    : imagenes[0];

  return (
    <section key={slug} className={styles.detalle}>
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
        {/* Galería (arriba-izquierda) */}
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

        {/* Columna derecha (sticky): panel de compra */}
        <div className={styles.info}>
          <p className={styles.eyebrow}>
            {producto.categoria} · SKU {producto.sku ?? producto.id}
          </p>
          <h1 className={styles.nombre}>{producto.nombre}</h1>

          <div className={styles.precios}>
            <span className={styles.precio}>
              {"$\u202F"}{producto.precio.toLocaleString("es-CL")}
            </span>
            {enOferta && (
              <>
                <span className={styles.precioAntes}>
                  {"$\u202F"}{producto.precioAnterior.toLocaleString("es-CL")}
                </span>
                <span className={styles.ahorro}>
                  Ahorras ${ahorro.toLocaleString("es-CL")}
                </span>
              </>
            )}
          </div>

          {producto.precioPorUnidad && (
            <p className={styles.precioPorUnidad}>
              {"$\u202F"}{producto.precioPorUnidad.monto.toLocaleString("es-CL")} por {producto.precioPorUnidad.unidad}
            </p>
          )}

          <p className={`${styles.stock} ${sinStock ? styles.stockAgotado : ""}`}>
            <span className={styles.punto} aria-hidden="true"></span>
            {textoStock}
          </p>

          <div className={styles.compra}>
            <ControlCantidad
              grande
              cantidad={cantidad}
              onDisminuir={() => setCantidad((c) => Math.max(1, c - 1))}
              onAumentar={() =>
                setCantidad((c) =>
                  disponiblesParaAgregar === null ? c + 1 : Math.min(c + 1, disponiblesParaAgregar),
                )
              }
              onFijar={(n) =>
                setCantidad(
                  disponiblesParaAgregar === null ? n : Math.min(n, disponiblesParaAgregar),
                )
              }
              puedeAumentar={disponiblesParaAgregar === null || cantidad < disponiblesParaAgregar}
            />

            <button
              className={styles.boton}
              onClick={() => agregarAlCarrito(producto, cantidad)}
              disabled={!puedeAgregar}
            >
              {puedeAgregar ? "Agregar al carrito" : "Stock completo en tu carrito"}
            </button>

            <button
              type="button"
              className={`${styles.botonFavorito} ${favorito ? styles.botonFavoritoActivo : ""}`}
              onClick={alternarFavoritoDetalle}
              aria-pressed={favorito}
            >
              <i className={`${favorito ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
              {favorito ? "En favoritos" : "Agregar a favoritos"}
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

        </div>

        {/* Zona de detalle (abajo-izquierda): descripción, ficha y reseñas. */}
        <div className={styles.zonaDetalle}>
          <section className={styles.descripcionBloque} aria-labelledby="descripcion-titulo">
            <h2 id="descripcion-titulo" className={styles.descripcionTitulo}>
              Descripción
            </h2>
            <p className={styles.descripcion}>{producto.descripcion}</p>
          </section>

          {detalles.length > 0 && (
            <dl className={styles.detallesProducto}>
              {detalles.map(({ etiqueta, valor }) => (
                <div key={etiqueta} className={styles.detalleProducto}>
                  <dt>{etiqueta}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          )}

          {sugeridos.length > 0 && (
            <section className={styles.recomendados} aria-labelledby="similares-titulo">
              <h2 id="similares-titulo" className={styles.recomendadosTitulo}>Descubre productos similares</h2>
              <div className={styles.recomendadosGrid}>
                {sugeridos.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} />
                ))}
              </div>
            </section>
          )}

          {teInteresan.length > 0 && (
            <section className={styles.recomendados} aria-labelledby="interesan-titulo">
              <h2 id="interesan-titulo" className={styles.recomendadosTitulo}>Te podrían interesar</h2>
              <div className={styles.recomendadosGrid}>
                {teInteresan.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} />
                ))}
              </div>
            </section>
          )}

          {productoTieneResenas && <ResenasProducto key={producto.id} productoId={producto.id} />}
        </div>
      </div>
    </section>
  );
}

export default ProductoDetalle;
