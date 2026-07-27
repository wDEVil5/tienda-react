import styles from "./Categorias.module.css";

// Sección "Categorías" del Home: un tile por categoría real (derivado de los
// productos) con imagen placeholder + nombre + conteo. Por ahora los tiles
// enlazan al catálogo (#catalogo); filtrar al hacer clic llegará con los
// filtros en la URL (RNF-6).
function Categorias({ productos }) {
  const categorias = [...new Set(productos.map((p) => p.categoria))];
  const conteo = (cat) => productos.filter((p) => p.categoria === cat).length;

  return (
    <section className={styles.categorias}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Categorías</h2>
        <a href="#catalogo" className={styles.verTodas}>
          Ver las {categorias.length} categorías
        </a>
      </div>

      <div className={styles.grid}>
        {categorias.map((cat) => (
          <a key={cat} href="#catalogo" className={styles.tile}>
            <div className={styles.imagen} aria-hidden="true"></div>
            <div>
              <p className={styles.nombre}>{cat}</p>
              <p className={styles.conteo}>{conteo(cat)} productos</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export default Categorias;
