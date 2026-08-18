import { useEffect, useLayoutEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { useCuenta } from "../context/CuentaContext.jsx";
import { useFavoritos } from "../context/FavoritosContext.jsx";
import { useAccesoModal } from "../context/AccesoModalContext.jsx";
import ImagenProducto from "../components/ImagenProducto.jsx";
import TarjetaProducto from "../components/TarjetaProducto.jsx";
import Estrellas from "../components/Estrellas.jsx";
import ResenasProducto from "../components/ResenasProducto.jsx";
import { leerDetalleProducto, obtenerMasVendidos, obtenerProductoDetalle, obtenerProductosSimilares } from "../services/productosApi.js";
import { fetchSilencioso } from "../lib/sondaDeRed.js";
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
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [copiado, setCopiado] = useState(false); // "Compartir" copió el enlace

  // Detalle prefetcheado por la navegación "retenida" (clic en una tarjeta): ya
  // está en caché, así que la ficha se muestra al instante y sin esqueleto.
  const detalleCacheado = leerDetalleProducto(slug);
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
    // Ya tenemos la ficha (prefetch o colección local): no repetimos la consulta.
    if (detalleCacheado !== undefined || productoLocal) return undefined;

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
  }, [detalleCacheado, productoLocal, slug]);

  const producto =
    (detalleCacheado !== undefined ? detalleCacheado : null) ??
    productoLocal ??
    (detalleRemoto.slug === slug ? detalleRemoto.producto : null);
  const cargandoProducto =
    detalleCacheado === undefined &&
    !productoLocal &&
    (detalleRemoto.slug !== slug || !detalleRemoto.terminado);

  // "Descubre productos similares": se piden al backend por el slug del producto
  // ya resuelto. Sin API o ante un fallo la función devuelve [] y no se muestra.
  const [similares, setSimilares] = useState([]);
  useEffect(() => {
    let vigente = true;
    obtenerProductosSimilares({ slug: producto?.slug, limit: 6, fetchImpl: fetchSilencioso })
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
    obtenerMasVendidos({ limit: 12, fetchImpl: fetchSilencioso })
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

  // Desliza suave hacia las reseñas en vez del salto brusco del ancla.
  const irAResenas = (evento) => {
    evento.preventDefault();
    document
      .getElementById("titulo-resenas")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Compartir: usa la hoja nativa del sistema si existe; si no, copia el enlace.
  const compartir = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: producto.nombre, url });
      } catch {
        // El usuario canceló el diálogo: no hacemos nada.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: silencioso.
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
          {(enOferta || producto.oferta) && <span className={styles.ofertaTag}>Oferta</span>}

          {producto.marca?.nombre && (
            producto.marca.slug ? (
              <Link to={`/catalogo?marca=${encodeURIComponent(producto.marca.slug)}`} className={styles.marcaLink}>{producto.marca.nombre}</Link>
            ) : (
              <span className={styles.marcaLink}>{producto.marca.nombre}</span>
            )
          )}

          <h1 className={styles.nombre}>{producto.nombre}</h1>

          <p className={styles.codigo}>Código: {producto.sku ?? producto.id}</p>

          {producto.resenas?.conteo > 0 && producto.resenas.promedio !== null && (
            <div className={styles.notaFila}>
              <Estrellas valor={producto.resenas.promedio} tamano={17} />
              <span className={styles.nota}>Nota {producto.resenas.promedio.toFixed(1)}</span>
              <a href="#titulo-resenas" className={styles.comentariosLink} onClick={irAResenas}>
                ({producto.resenas.conteo} {producto.resenas.conteo === 1 ? "comentario" : "comentarios"})
              </a>
            </div>
          )}

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

          <button
            className={styles.boton}
            onClick={() => agregarAlCarrito(producto)}
            disabled={!puedeAgregar}
          >
            {puedeAgregar ? "Agregar" : "Stock completo en tu carrito"}
          </button>

          <div className={styles.divisor} />

          <div className={styles.accionesSecundarias}>
            <button
              type="button"
              className={`${styles.accionSecundaria} ${favorito ? styles.accionActiva : ""}`}
              onClick={alternarFavoritoDetalle}
              aria-pressed={favorito}
            >
              <span className={styles.accionIcono}>
                <i className={`${favorito ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" />
              </span>
              {favorito ? "En Mis listas" : "Agregar a Mis listas"}
            </button>
            <span className={styles.accionesLinea} aria-hidden="true" />
            <button type="button" className={styles.accionSecundaria} onClick={compartir}>
              <span className={styles.accionIcono}>
                <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" />
              </span>
              {copiado ? "¡Enlace copiado!" : "Compartir producto"}
            </button>
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
