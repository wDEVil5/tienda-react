import Hero from "../components/Hero.jsx";
import TiraConfianza from "../components/TiraConfianza.jsx";
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
  orden,
  onOrdenar,
  productosCatalogo,
  onVerOfertas,
  onVerCatalogo,
}) {
  return (
    <>
      <Hero
        productos={productos}
        onVerOfertas={onVerOfertas}
        onVerCatalogo={onVerCatalogo}
      />
      <TiraConfianza />
      <Categorias
        productos={productos}
        onBuscar={onBuscar}
        onSeleccionarCategoria={onSeleccionarCategoria}
        onCambiarSoloOfertas={onCambiarSoloOfertas}
      />
      <BandaOfertas productos={productos} onVerOfertas={onVerOfertas} />
      <Catalogo
        productos={productosCatalogo}
        productosBase={productos}
        busqueda={busqueda}
        onBuscar={onBuscar}
        categoria={categoria}
        onSeleccionarCategoria={onSeleccionarCategoria}
        soloOfertas={soloOfertas}
        onCambiarSoloOfertas={onCambiarSoloOfertas}
        orden={orden}
        onOrdenar={onOrdenar}
      />
      <ComoComprar />
      <MarcasGondola />
    </>
  );
}

export default Home;
