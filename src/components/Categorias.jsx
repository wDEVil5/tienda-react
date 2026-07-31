import { useNavigate } from "react-router-dom";
import styles from "./Categorias.module.css";

// Sección "Categorías" del Home: un tile por categoría real (derivado de los
// productos). Al hacer clic, el tile FILTRA el catálogo: no guarda el filtro
// aquí, solo avisa la intención al estado que vive en App (lifting state up) y
// luego navega a la sección del catálogo, donde App hace el scroll.
function Categorias({
  productos,
  categorias,
  onBuscar,
  onSeleccionarCategoria,
  onCambiarSoloOfertas,
}) {
  const navegar = useNavigate();
  const categoriasMostradas = categorias.length
    ? categorias
    : [...new Set(productos.map((p) => p.categoria))].map((nombre) => ({
        id: nombre,
        nombre,
        slug: nombre,
        productCount: productos.filter((producto) => producto.categoria === nombre).length,
      }));

  // Mismo gesto que la sugerencia de categoría del Header: limpia la búsqueda,
  // apaga "solo ofertas" y fija la categoría antes de llevar al catálogo. El
  // `cat` es el mismo string que compara Catalogo.jsx, así que filtra directo.
  const seleccionar = (cat) => {
    onBuscar("");
    onSeleccionarCategoria(cat);
    onCambiarSoloOfertas(false);
    navegar("/#catalogo");
  };

  return (
    <section className={styles.categorias}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Compra por categoría</h2>
        <a href="#catalogo" className={styles.verTodas}>
          Ver las {categoriasMostradas.length} categorías
        </a>
      </div>

      <div className={styles.grid}>
        {categoriasMostradas.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={styles.tile}
            onClick={() => seleccionar(cat.nombre)}
          >
            <div className={styles.info}>
              <p className={styles.nombre}>{cat.nombre}</p>
              <p className={styles.conteo}>{cat.productCount} productos</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default Categorias;
