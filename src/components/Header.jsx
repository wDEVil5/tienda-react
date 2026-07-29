import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import ImagenProducto from "./ImagenProducto.jsx";

function Header({
  busqueda,
  onBuscar,
  productos,
  onSeleccionarCategoria,
  onCambiarSoloOfertas,
  onVerOfertas,
  onVerCatalogo,
  onAbrirCarrito,
}) {
  const { totalItems, carrito } = useCarritoContext();
  const [menuAbierto, setMenuAbierto] = useState(false); // menú hamburguesa (móvil)
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const navegar = useNavigate();
  const cerrarMenu = () => setMenuAbierto(false);
  const termino = busqueda.trim();

  // Por ahora filtramos el catálogo ya cargado en memoria. Cuando exista la
  // API propia, este bloque se reemplaza por una consulta debounced a
  // GET /api/productos?busqueda=..., manteniendo el mismo formato de salida.
  const normalizar = (texto) => texto.toLocaleLowerCase("es-CL");
  const coincideBusqueda = (producto) =>
    normalizar(producto.nombre).includes(normalizar(termino));
  const resultados = termino ? productos.filter(coincideBusqueda) : [];
  const sugerenciasProductos = resultados.slice(0, 3);
  const categoriasSugeridas = [
    ...new Set(resultados.map((producto) => producto.categoria)),
  ].slice(0, 3);

  const verResultados = () => {
    // La búsqueda se ejecuta en el catálogo completo, no dentro de una
    // categoría que hubiese quedado seleccionada anteriormente.
    onSeleccionarCategoria("todas");
    onCambiarSoloOfertas(false);
    setSugerenciasAbiertas(false);
    navegar("/#catalogo");
  };

  const cambiarBusqueda = (valor) => {
    // Al escribir una búsqueda nueva limpiamos la categoría para evitar un
    // resultado vacío causado por dos filtros que el usuario no ve juntos.
    onBuscar(valor);
    onSeleccionarCategoria("todas");
    onCambiarSoloOfertas(false);
    setSugerenciasAbiertas(Boolean(valor.trim()));
  };

  const seleccionarCategoria = (categoria) => {
    // Este botón sí filtra: limpia el término y actualiza el estado compartido
    // que consume Catalogo.jsx antes de llevar al usuario a esa sección.
    onBuscar("");
    onSeleccionarCategoria(categoria);
    onCambiarSoloOfertas(false);
    setSugerenciasAbiertas(false);
    navegar("/#catalogo");
  };

  // Monto total del carrito (estado derivado) para el chip del header.
  const total = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0
  );

  return (
    <header className={styles.header}>
      {/* Franja utilitaria. "Entregar en Providencia" será dinámico cuando
          exista el contexto de modo de entrega/comuna (lógica del sistema). */}
      <div className={styles.franja}>
        <div className={styles.contenedor}>
          <button className={styles.franjaSelector} type="button">
            Entregar en Providencia
            <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </button>
          <span className={styles.franjaSep} aria-hidden="true"></span>
          <span>Retiro gratis en tienda</span>
        </div>
      </div>

      <div className={styles.barraPrincipal}>
        <div className={styles.contenedor}>
          <Link to="/" className={styles.logo}>
            Sumarket<em>Express</em>
          </Link>

          {/* Hamburguesa: solo visible en móvil (CSS). Abre el menú de abajo. */}
          <button
            className={styles.hamburguesa}
            type="button"
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            aria-label="Abrir menú"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <i
              className={`fa-solid ${menuAbierto ? "fa-xmark" : "fa-bars"}`}
              aria-hidden="true"
            ></i>
          </button>

          <form
            className={styles.buscador}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              verResultados();
            }}
          >
            <i
              className={`fa-solid fa-magnifying-glass ${styles.lupa}`}
              aria-hidden="true"
            ></i>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              onFocus={() => setSugerenciasAbiertas(Boolean(termino))}
              onBlur={() => setSugerenciasAbiertas(false)}
              aria-label="Buscar producto"
              aria-expanded={sugerenciasAbiertas}
              aria-controls="sugerencias-busqueda"
            />
            {termino && (
              <button
                className={styles.limpiarBusqueda}
                type="button"
                onClick={() => cambiarBusqueda("")}
                aria-label="Limpiar búsqueda"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            )}
            {/* Se mantiene montado mientras haya término para animar su cierre.
                `inert` evita que enlaces ocultos entren al orden de tabulación. */}
            {termino && (
              <div
                id="sugerencias-busqueda"
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
                          to={`/producto/${producto.id}`}
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
                            <span className={styles.sugerenciaNombre}>
                              {producto.nombre}
                            </span>
                            <span className={styles.sugerenciaCategoria}>
                              {producto.categoria}
                            </span>
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
                    <div className={styles.sugerenciasSeparador}></div>
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
                  <button
                    type="button"
                    className={styles.verResultados}
                    onClick={verResultados}
                  >
                    Ver los {resultados.length} resultados de “{termino}”
                  </button>
                )}
              </div>
            )}
          </form>

          {/* Placeholder: llevará a /login cuando exista la auth (Fase 3). */}
          <button className={styles.entrar} type="button">
            Entrar
          </button>

          <button className={styles.carrito} onClick={onAbrirCarrito}>
            <i className="fa-solid fa-cart-shopping" aria-hidden="true"></i>
            <span className={styles.carritoTexto}>
              <span className={styles.carritoLabel}>Mi carrito</span>
              <span className={styles.carritoMonto}>
                ${total.toLocaleString("es-CL")}
              </span>
            </span>
            {totalItems > 0 && (
              <span className={styles.contador}>{totalItems}</span>
            )}
          </button>
        </div>
      </div>

      {/* Permanece montado para animar apertura/cierre; `inert` lo excluye del
          teclado y lector de pantalla cuando está plegado. */}
      <nav
        id="menu-movil"
        className={`${styles.menuMovil} ${menuAbierto ? styles.menuAbierto : ""}`}
        aria-label="Menú"
        aria-hidden={!menuAbierto}
        inert={!menuAbierto}
      >
          <Link
            to="/#catalogo"
            onClick={() => {
              onVerCatalogo();
              cerrarMenu();
            }}
            className={styles.menuLink}
          >
            Catálogo
          </Link>
          <Link
            to="/#catalogo"
            onClick={() => {
              onVerOfertas();
              cerrarMenu();
            }}
            className={styles.menuLink}
          >
            Ofertas
          </Link>
          <Link to="/#como-comprar" onClick={cerrarMenu} className={styles.menuLink}>
            Cómo comprar
          </Link>
          <Link to="/#nuestra-tienda" onClick={cerrarMenu} className={styles.menuLink}>
            Nuestra tienda
          </Link>
          <button
            className={styles.menuEntrar}
            type="button"
            onClick={cerrarMenu}
          >
            Entrar
          </button>
      </nav>

      {/* Navegación por secciones del Home. Los hashes también funcionan si se
          navega desde una ficha de producto (App se encarga del scroll). */}
      <nav className={styles.navFila} aria-label="Navegación principal">
        <div className={styles.contenedor}>
          <Link to="/#catalogo" className={styles.navLink} onClick={onVerCatalogo}>
            Catálogo
          </Link>
          <Link to="/#catalogo" className={styles.navLink} onClick={onVerOfertas}>
            Ofertas
          </Link>
          <Link to="/#como-comprar" className={styles.navLink}>
            Cómo comprar
          </Link>
          <Link to="/#nuestra-tienda" className={styles.navLink}>
            Nuestra tienda
          </Link>
        </div>
      </nav>

      {/* Barra de estado. "Tienda abierta" será dinámico cuando exista la
          lógica de horario/corte de las reglas de la tienda (Fase 5). */}
      <div className={styles.estado}>
        <div className={styles.contenedor}>
          <span className={styles.estadoInfo}>
            <span className={styles.punto} aria-hidden="true"></span>
            <span>
              <strong>Tienda abierta</strong>
              <span className={styles.estadoLargo}>
                {" "}· pedidos hasta las 19:00 se retiran hoy mismo
              </span>
              <span className={styles.estadoCorto}>
                {" "}· retira hoy hasta las 19:00
              </span>
            </span>
          </span>
          <button className={styles.verHorarios} type="button">
            Ver horarios
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
