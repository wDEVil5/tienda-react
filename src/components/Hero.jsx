import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Hero.module.css";
import ImagenProducto from "./ImagenProducto.jsx";
import { useReglas } from "../context/ReglasContext.jsx";

// Íconos lineales (1.5px), sin dependencias externas ni emoji.
function Svg({ children, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const IconoLupa = () => (
  <Svg size={18}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);
const IconoFlecha = () => (
  <Svg size={18}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

// Sección héroe del Home: fondo neblina claro a todo el ancho, contenido
// centrado. Aloja el buscador con autocompletado (movido desde el header), los
// accesos por categoría, los CTA y la línea de estado de la tienda.
function Hero({
  productos,
  busqueda,
  onBuscar,
  onSeleccionarCategoria,
  onCambiarSoloOfertas,
  onVerOfertas,
  onVerCatalogo,
}) {
  const { corteRetiroHoy } = useReglas();
  const navegar = useNavigate();
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const termino = busqueda.trim();

  const normalizar = (texto) => texto.toLocaleLowerCase("es-CL");
  const resultados = termino
    ? productos.filter((p) => normalizar(p.nombre).includes(normalizar(termino)))
    : [];
  const sugerenciasProductos = resultados.slice(0, 3);
  const categoriasSugeridas = [
    ...new Set(resultados.map((p) => p.categoria)),
  ].slice(0, 3);

  // Accesos rápidos: primeras 3 categorías del catálogo + chip de ofertas.
  const accesos = [...new Set(productos.map((p) => p.categoria))].slice(0, 3);

  const verResultados = () => {
    onSeleccionarCategoria("todas");
    onCambiarSoloOfertas(false);
    setSugerenciasAbiertas(false);
    navegar("/#catalogo");
  };

  const cambiarBusqueda = (valor) => {
    onBuscar(valor);
    onSeleccionarCategoria("todas");
    onCambiarSoloOfertas(false);
    setSugerenciasAbiertas(Boolean(valor.trim()));
  };

  const seleccionarCategoria = (categoria) => {
    onBuscar("");
    onSeleccionarCategoria(categoria);
    onCambiarSoloOfertas(false);
    setSugerenciasAbiertas(false);
    navegar("/#catalogo");
  };

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Minimarket del barrio desde 2014</p>
        <h1 className={styles.titulo}>
          Tu despensa,
          <br />
          lista <em>esta tarde</em>
        </h1>
        <p className={styles.parrafo}>
          Más de 200 productos del barrio con precio real y stock al día.
          Retira hoy o recíbelo mañana.
        </p>

        {/* Buscador destacado tipo cápsula blanca con botón circular de envío. */}
        <form
          className={styles.buscador}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            verResultados();
          }}
        >
          <span className={styles.lupa}>
            <IconoLupa />
          </span>
          <input
            type="text"
            placeholder="Buscar producto…"
            value={busqueda}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            onFocus={() => setSugerenciasAbiertas(Boolean(termino))}
            onBlur={() => setSugerenciasAbiertas(false)}
            aria-label="Buscar producto"
            aria-expanded={sugerenciasAbiertas}
            aria-controls="sugerencias-hero"
          />
          <button className={styles.enviar} type="submit" aria-label="Buscar">
            <IconoFlecha />
          </button>

          {termino && (
            <div
              id="sugerencias-hero"
              className={`${styles.sugerencias} ${sugerenciasAbiertas ? styles.sugerenciasAbiertas : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              aria-hidden={!sugerenciasAbiertas}
              inert={!sugerenciasAbiertas}
            >
              {sugerenciasProductos.length > 0 ? (
                <>
                  <p className={styles.sugerenciasTitulo}>Productos</p>
                  <div className={styles.sugerenciasLista}>
                    {sugerenciasProductos.map((producto) => (
                      <Link
                        key={producto.id}
                        to={`/producto/${producto.slug ?? producto.id}`}
                        className={styles.sugerenciaProducto}
                        onClick={() => setSugerenciasAbiertas(false)}
                      >
                        <span className={styles.sugerenciaImagen}>
                          <ImagenProducto
                            src={producto.imagen}
                            alt=""
                            className={styles.sugerenciaImagenProducto}
                          />
                        </span>
                        <span className={styles.sugerenciaInfo}>
                          <span className={styles.sugerenciaNombre}>{producto.nombre}</span>
                          <span className={styles.sugerenciaCategoria}>{producto.categoria}</span>
                        </span>
                        <span className={styles.sugerenciaPrecio}>
                          ${producto.precio.toLocaleString("es-CL")}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className={styles.sinSugerencias}>
                  No encontramos productos para “{termino}”.
                </p>
              )}

              {categoriasSugeridas.length > 0 && (
                <>
                  <div className={styles.sugerenciasSeparador} />
                  <p className={styles.sugerenciasTitulo}>Categorías</p>
                  <div className={styles.sugerenciasCategorias}>
                    {categoriasSugeridas.map((categoria) => (
                      <button
                        key={categoria}
                        type="button"
                        className={styles.sugerenciaCategoriaChip}
                        onClick={() => seleccionarCategoria(categoria)}
                      >
                        {categoria}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {resultados.length > 0 && (
                <button type="button" className={styles.verTodos} onClick={verResultados}>
                  Ver los {resultados.length} resultados de “{termino}”
                </button>
              )}
            </div>
          )}
        </form>

        {/* Accesos rápidos por categoría; el chip de ofertas va diferenciado. */}
        <div className={styles.accesos} aria-label="Categorías destacadas">
          {accesos.map((acceso) => (
            <button
              key={acceso}
              type="button"
              className={styles.acceso}
              onClick={() => seleccionarCategoria(acceso)}
            >
              {acceso}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.acceso} ${styles.accesoOferta}`}
            onClick={() => {
              onVerOfertas();
              navegar("/#catalogo");
            }}
          >
            Ofertas −20%
          </button>
        </div>

        {/* Un único CTA sólido + el secundario como enlace subrayado. */}
        <div className={styles.acciones}>
          <Link to="/#catalogo" className={styles.btnPrimario} onClick={onVerCatalogo}>
            Ver el catálogo
          </Link>
          <Link to="/#catalogo" className={styles.btnSecundario} onClick={onVerOfertas}>
            Ofertas de la semana
          </Link>
        </div>

        {/* Estado de la tienda + corte horario (de las reglas) + ver horarios. */}
        <div className={styles.estado}>
          <span className={styles.punto} aria-hidden="true" />
          <span className={styles.estadoTexto}>
            <strong>Tienda abierta</strong> · pedidos hasta las {corteRetiroHoy} se retiran hoy
          </span>
          <span className={styles.estadoSep} aria-hidden="true">·</span>
          <button type="button" className={styles.verHorarios}>ver horarios</button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
