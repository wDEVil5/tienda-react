import Hero from "../components/Hero.jsx";
import TiraConfianza from "../components/TiraConfianza.jsx";
import Categorias from "../components/Categorias.jsx";
import BandaOfertas from "../components/BandaOfertas.jsx";
import Catalogo from "../components/Catalogo.jsx";

// Página de inicio: compone las secciones del Home en orden.
function Home({ productos, busqueda }) {
  return (
    <>
      <Hero />
      <TiraConfianza />
      <Categorias productos={productos} />
      <BandaOfertas productos={productos} />
      <Catalogo productos={productos} busqueda={busqueda} />
    </>
  );
}

export default Home;
