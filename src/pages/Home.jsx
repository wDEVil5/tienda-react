import { Link } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import TiraConfianza from "../components/TiraConfianza.jsx";
import CarruselProductos from "../components/CarruselProductos.jsx";
import Categorias from "../components/Categorias.jsx";
import ComoComprar from "../components/ComoComprar.jsx";
import Catalogo from "../components/Catalogo.jsx";
import MarcasGondola from "../components/MarcasGondola.jsx";

// Página de inicio: compone las secciones del Home en orden.
function Home({
  productos,
  busqueda,
  onBuscar,
  categoria,
  onSeleccionarCategoria,
  soloOfertas,
  onCambiarSoloOfertas,
  precioMin,
  precioMax,
  onCambiarPrecioMin,
  onCambiarPrecioMax,
  orden,
  onOrdenar,
  productosCatalogo,
  categorias,
  metaCatalogo,
  ofertasDestacadas,
  usaPaginacionServidor,
  cargandoMas,
  onCargarMas,
  onVerOfertas,
  onVerCatalogo,
}) {
  // Fila "Destacados": los productos que el admin marcó como destacados; si aún
  // no hay ninguno, mostramos los primeros del catálogo para que la fila no quede
  // vacía. Máximo 12 por fila.
  const destacados = productos.filter((producto) => producto.destacado);
  const filaDestacados = (destacados.length ? destacados : productos).slice(0, 12);

  // Fila "Ofertas de la semana": productos con precio anterior. El "Hasta X%" sale
  // del resumen global de la API (todas las ofertas, no solo las cargadas); si no,
  // se deriva de las ofertas visibles.
  const ofertas = productos.filter((producto) => producto.precioAnterior !== null);
  const filaOfertas = ofertas.slice(0, 12);
  const maxDescuento =
    ofertasDestacadas?.meta?.maxDescuento ??
    (ofertas.length
      ? Math.max(
          ...ofertas.map((p) => Math.round((1 - p.precio / p.precioAnterior) * 100)),
        )
      : 0);

  // Filas por categoría: una por cada categoría con productos suficientes. Se
  // derivan de los propios productos (sin depender de otra fuente) y se limitan a
  // unas pocas para no alargar la portada; el catálogo completo va más abajo.
  const MAX_FILAS_CATEGORIA = 3;
  const filasCategoria = [...new Set(productos.map((p) => p.categoria))]
    .map((nombre) => ({
      nombre,
      productos: productos.filter((p) => p.categoria === nombre),
    }))
    .filter((fila) => fila.productos.length >= 4)
    .slice(0, MAX_FILAS_CATEGORIA);

  // Aplica el filtro de una categoría y limpia búsqueda/ofertas, como en el Hero.
  const verCategoria = (nombre) => {
    onBuscar("");
    onSeleccionarCategoria(nombre);
    onCambiarSoloOfertas(false);
  };

  return (
    <>
      <Hero
        productos={productos}
        busqueda={busqueda}
        onBuscar={onBuscar}
        onSeleccionarCategoria={onSeleccionarCategoria}
        onCambiarSoloOfertas={onCambiarSoloOfertas}
        onVerOfertas={onVerOfertas}
        onVerCatalogo={onVerCatalogo}
      />
      <TiraConfianza />
      <CarruselProductos
        eyebrow="Selección de la semana"
        titulo="Destacados"
        productos={filaDestacados}
        accion={
          <Link to="/#catalogo" onClick={onVerCatalogo}>
            Ver todo →
          </Link>
        }
      />
      <Categorias
        productos={productos}
        categorias={categorias}
        onBuscar={onBuscar}
        onSeleccionarCategoria={onSeleccionarCategoria}
        onCambiarSoloOfertas={onCambiarSoloOfertas}
      />
      <CarruselProductos
        eyebrow={maxDescuento ? `Hasta ${maxDescuento}% menos` : "Precios rebajados"}
        titulo="Ofertas de la semana"
        productos={filaOfertas}
        accion={
          <Link to="/#catalogo" onClick={onVerOfertas}>
            Ver ofertas →
          </Link>
        }
      />
      {filasCategoria.map((fila) => (
        <CarruselProductos
          key={fila.nombre}
          eyebrow="Categoría"
          titulo={fila.nombre}
          productos={fila.productos.slice(0, 12)}
          accion={
            <Link to="/#catalogo" onClick={() => verCategoria(fila.nombre)}>
              Ver todo →
            </Link>
          }
        />
      ))}
      <Catalogo
        productos={productosCatalogo}
        productosBase={productos}
        categorias={categorias}
        busqueda={busqueda}
        onBuscar={onBuscar}
        categoria={categoria}
        onSeleccionarCategoria={onSeleccionarCategoria}
        soloOfertas={soloOfertas}
        onCambiarSoloOfertas={onCambiarSoloOfertas}
        precioMin={precioMin}
        precioMax={precioMax}
        onCambiarPrecioMin={onCambiarPrecioMin}
        onCambiarPrecioMax={onCambiarPrecioMax}
        orden={orden}
        onOrdenar={onOrdenar}
        metaCatalogo={metaCatalogo}
        usaPaginacionServidor={usaPaginacionServidor}
        cargandoMas={cargandoMas}
        onCargarMas={onCargarMas}
      />
      <ComoComprar />
      <MarcasGondola />
    </>
  );
}

export default Home;
