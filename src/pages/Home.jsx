import { Link } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import BannerCarrusel from "../components/BannerCarrusel.jsx";
import TiraConfianza from "../components/TiraConfianza.jsx";
import CarruselProductos from "../components/CarruselProductos.jsx";
import Categorias from "../components/Categorias.jsx";
import ComoComprar from "../components/ComoComprar.jsx";
import MarcasGondola from "../components/MarcasGondola.jsx";

// Página de inicio: banner + carruseles editoriales + marcas. El catálogo
// completo ya no vive aquí: cada categoría/subcategoría/oferta/búsqueda abre su
// propia página de listado (ver PaginaCatalogo). El Home solo "muestra y enlaza".
function Home({ productos, categorias, ofertasDestacadas, masVendidos }) {
  // Fila "Destacados": los productos marcados como destacados; si aún no hay
  // ninguno, mostramos los primeros para que la fila no quede vacía. Máx. 12.
  const destacados = productos.filter((producto) => producto.destacado);
  const filaDestacados = (destacados.length ? destacados : productos).slice(0, 12);

  // Fila "Ofertas de la semana": productos con precio anterior. El "Hasta X%"
  // sale del resumen global de la API; si no, se deriva de las ofertas visibles.
  const ofertas = productos.filter((producto) => producto.precioAnterior !== null);
  const filaOfertas = ofertas.slice(0, 12);
  const maxDescuento =
    ofertasDestacadas?.meta?.maxDescuento ??
    (ofertas.length
      ? Math.max(...ofertas.map((p) => Math.round((1 - p.precio / p.precioAnterior) * 100)))
      : 0);

  // Filas por categoría: una por cada categoría con productos suficientes. El
  // slug (para el enlace a su página) sale del propio producto.
  const MAX_FILAS_CATEGORIA = 3;
  const filasCategoria = [...new Set(productos.map((p) => p.categoria))]
    .map((nombre) => {
      const productosCategoria = productos.filter((p) => p.categoria === nombre);
      return { nombre, slug: productosCategoria[0]?.categoriaSlug, productos: productosCategoria };
    })
    .filter((fila) => fila.slug && fila.productos.length >= 4)
    .slice(0, MAX_FILAS_CATEGORIA);

  return (
    <>
      <BannerCarrusel fallback={<Hero productos={productos} />} />
      {masVendidos?.length > 0 && (
        <CarruselProductos
          eyebrow="Los favoritos de nuestros clientes"
          titulo="Lo más vendido"
          productos={masVendidos.slice(0, 12)}
          accion={<Link to="/catalogo">Ver todo →</Link>}
        />
      )}
      <CarruselProductos
        eyebrow="Selección de la semana"
        titulo="Destacados"
        productos={filaDestacados}
        accion={<Link to="/catalogo">Ver todo →</Link>}
      />
      <Categorias productos={productos} categorias={categorias} />
      <CarruselProductos
        eyebrow={maxDescuento ? `Hasta ${maxDescuento}% menos` : "Precios rebajados"}
        titulo="Ofertas de la semana"
        productos={filaOfertas}
        accion={<Link to="/ofertas">Ver ofertas →</Link>}
      />
      {filasCategoria.map((fila) => (
        <CarruselProductos
          key={fila.nombre}
          eyebrow="Categoría"
          titulo={fila.nombre}
          productos={fila.productos.slice(0, 12)}
          accion={<Link to={`/categoria/${fila.slug}`}>Ver todo →</Link>}
        />
      ))}
      <TiraConfianza />
      <ComoComprar />
      <MarcasGondola />
    </>
  );
}

export default Home;
