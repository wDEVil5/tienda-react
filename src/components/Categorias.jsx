import { Link } from "react-router-dom";
import styles from "./Categorias.module.css";

// Sección "Categorías" del Home: un tile por categoría real. Cada uno enlaza a la
// página de esa categoría (/categoria/:slug), donde se ve su catálogo completo.
function Categorias({ productos, categorias }) {
  const categoriasMostradas = categorias.length
    ? categorias
    : [...new Set(productos.map((p) => p.categoria))].map((nombre) => {
        const productosCategoria = productos.filter((producto) => producto.categoria === nombre);
        return {
          id: nombre,
          nombre,
          slug: productosCategoria[0]?.categoriaSlug ?? nombre,
          productCount: productosCategoria.length,
        };
      });

  return (
    <section className={styles.categorias}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Compra por categoría</h2>
      </div>

      <div className={styles.grid}>
        {categoriasMostradas.map((cat) => (
          <Link key={cat.id} to={`/categoria/${cat.slug}`} className={styles.tile}>
            <div className={styles.info}>
              <p className={styles.nombre}>{cat.nombre}</p>
              {cat.productCount != null && <p className={styles.conteo}>{cat.productCount} productos</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default Categorias;
