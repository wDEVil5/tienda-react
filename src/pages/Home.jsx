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
}) {
  return (
    <>
      <Hero productos={productos} />
      <TiraConfianza />
      <Categorias productos={productos} />
      <BandaOfertas productos={productos} />
      <ComoComprar />
      <Catalogo
        productos={productos}
        busqueda={busqueda}
        onBuscar={onBuscar}
        categoria={categoria}
        onSeleccionarCategoria={onSeleccionarCategoria}
      />
      <MarcasGondola />
    </>
  );
}

export default Home;
