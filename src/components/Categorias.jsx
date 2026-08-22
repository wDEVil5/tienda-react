import { Link } from "react-router-dom";
import styles from "./Categorias.module.css";

// Sección "Categorías" del Home con layout BENTO asimétrico: una categoría
// destacada (tarjeta grande a la izquierda) + hasta 3 secundarias + un CTA
// "Ver todas". La destacada es la marcada como tal o, si no, la de más productos.
function Categorias({ productos, categorias }) {
  // Sin API propia, derivamos una lista temporal desde los productos cargados.
  const lista = categorias.length
    ? categorias
    : [...new Set(productos.map((p) => p.categoria))].map((nombre) => {
        const items = productos.filter((p) => p.categoria === nombre);
        return { id: nombre, nombre, slug: items[0]?.categoriaSlug ?? nombre, productCount: items.length };
      });

  if (!lista.length) return null;

  // Orden por cantidad de productos (desc). La destacada: la marcada o la mayor.
  const ordenadas = [...lista].sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));
  const destacada = ordenadas.find((c) => c.destacada) ?? ordenadas[0];
  const secundarias = ordenadas.filter((c) => c !== destacada).slice(0, 3);

  const plural = (n) => `${n} ${n === 1 ? "producto" : "productos"}`;

  // Meta de la destacada: "N productos · sub1, sub2, sub3".
  const subs = (destacada.subcategorias ?? [])
    .slice(0, 3)
    .map((s) => s.nombre?.toLowerCase())
    .filter(Boolean)
    .join(", ");
  const metaDestacada = [plural(destacada.productCount ?? 0), subs].filter(Boolean).join(" · ");

  return (
    <section className={styles.seccion} aria-labelledby="categorias-titulo">
      {/* .inner alinea el contenido con los carruseles; .caja es el recuadro. */}
      <div className={styles.inner}>
       <div className={styles.caja}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Categorías</p>
          <h2 id="categorias-titulo" className={styles.titulo}>Todo el súper, ordenado</h2>
        </header>

        <div className={styles.grid}>
          {/* Destacada: tarjeta grande verde, alto doble */}
          <Link to={`/categoria/${destacada.slug}`} className={`${styles.tarjeta} ${styles.destacada}`}>
            {destacada.imagen ? (
              <img className={styles.imagen} src={destacada.imagen} alt="" loading="lazy" />
            ) : (
              <span className={styles.textura} aria-hidden="true" />
            )}
            <span className={styles.contenido}>
              <span className={styles.badge}>más comprada</span>
              <span>
                <span className={styles.nombreDestacada}>{destacada.nombre}</span>
                <span className={styles.metaDestacada}>{metaDestacada}</span>
              </span>
            </span>
          </Link>

          {/* Secundarias (o "próximamente" si no tienen productos) */}
          {secundarias.map((cat) => {
            const proximamente = (cat.productCount ?? 0) === 0;
            const cuerpo = (
              <span className={styles.contenido}>
                <span className={styles.nombre}>{cat.nombre}</span>
                <span className={styles.conteo}>
                  {proximamente ? "próximamente" : plural(cat.productCount)}
                </span>
              </span>
            );
            if (proximamente) {
              // Sin productos: no es enlace (nada que abrir todavía).
              return (
                <div key={cat.id ?? cat.slug} className={`${styles.tarjeta} ${styles.secundaria} ${styles.proximamente}`}>
                  {cuerpo}
                </div>
              );
            }
            return (
              <Link key={cat.id ?? cat.slug} to={`/categoria/${cat.slug}`} className={`${styles.tarjeta} ${styles.secundaria}`}>
                <span className={styles.textura} aria-hidden="true" />
                {cuerpo}
              </Link>
            );
          })}

          {/* CTA: ver todo el catálogo */}
          <Link to="/catalogo" className={`${styles.tarjeta} ${styles.cta}`}>
            <span className={styles.contenido}>
              <span className={styles.ctaTexto}>Ver todas</span>
              <span className={styles.flecha} aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
       </div>
      </div>
    </section>
  );
}

export default Categorias;
