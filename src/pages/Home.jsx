import Hero from "../components/Hero.jsx";
import TiraConfianza from "../components/TiraConfianza.jsx";
import Catalogo from "../components/Catalogo.jsx";

// Página de inicio: compone las secciones del Home en orden. Faltan por agregar
// categorías y banda de ofertas entre la tira de confianza y el catálogo.
function Home({ productos, busqueda }) {
  return (
    <>
      <Hero />
      <TiraConfianza />
      <Catalogo productos={productos} busqueda={busqueda} />
    </>
  );
}

export default Home;
