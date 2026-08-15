import { Link } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import TiraConfianza from "../components/TiraConfianza.jsx";
import CarruselProductos from "../components/CarruselProductos.jsx";
import Categorias from "../components/Categorias.jsx";
import BandaOfertas from "../components/BandaOfertas.jsx";
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
      <BandaOfertas
        productos={productos}
        ofertasDestacadas={ofertasDestacadas}
        onVerOfertas={onVerOfertas}
      />
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
