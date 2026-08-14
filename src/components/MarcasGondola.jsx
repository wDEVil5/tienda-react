import { useEffect, useState } from "react";
import styles from "./MarcasGondola.module.css";
import { crearUrlLogoBrandfetch, obtenerMarcas } from "../services/marcasApi.js";

function Pista({ marcas, direccion }) {
  const claseFila = direccion === "izquierda" ? styles.filaIzq : styles.filaDer;
  // Una vuelta debe ser más ancha que la pista visible. Con dos marcas no
  // alcanza: repetimos el grupo dentro de la vuelta antes de duplicarla para
  // el loop, evitando espacios vacíos mientras el carrusel se mueve.
  const repeticionesPorVuelta = Math.max(1, Math.ceil(8 / marcas.length));
  const vuelta = Array.from({ length: repeticionesPorVuelta }, () => marcas).flat();
  return (
    <div className={`${styles.fila} ${claseFila}`}>
      {/* Dos vueltas idénticas hacen posible volver al inicio sin un salto. */}
      <div className={styles.track}>
        {[...vuelta, ...vuelta].map((marca, i) => (
          <div
            key={`${marca.id}-${i}`}
            className={styles.tile}
          >
            {marca.logoUrl || marca.brandfetchDomain ? (
              <LogoMarca marca={marca} />
            ) : (
              <span className={styles.nombreFallback}>{marca.nombre}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogoMarca({ marca }) {
  const [fallo, setFallo] = useState(false);
  const origen = marca.logoUrl ?? crearUrlLogoBrandfetch(marca.brandfetchDomain);

  if (!origen || fallo) {
    return <span className={styles.nombreFallback}>{marca.nombre}</span>;
  }

  return (
    <img
      className={styles.logo}
      src={origen}
      alt=""
      onError={() => setFallo(true)}
    />
  );
}

function MarcasGondola() {
  const [marcas, setMarcas] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerMarcas().then((respuesta) => {
      if (vigente) setMarcas(respuesta);
    });
    return () => {
      vigente = false;
    };
  }, []);

  // No mostramos los placeholders antiguos: hasta que existan marcas públicas
  // reales, esta franja editorial no aporta información al visitante.
  if (!marcas?.length) return null;

  const filaArriba = marcas.slice(0, Math.ceil(marcas.length / 2));
  const filaAbajo = marcas.slice(filaArriba.length);

  return (
    <section id="nuestra-tienda" className={styles.marcas}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Marcas en góndola</p>
            <h2 className={styles.titulo}>Trabajamos con las marcas de siempre</h2>
          </div>
          <p className={styles.nota}>
            Las marcas que conoces, al precio de siempre.
          </p>
        </div>
      </div>

      {/* Decorativo: el lector de pantalla no necesita leer los logos repetidos. */}
      <div className={styles.pistas} aria-hidden="true">
        <Pista marcas={filaArriba} direccion="izquierda" />
        {filaAbajo.length > 0 && <Pista marcas={filaAbajo} direccion="derecha" />}
      </div>
    </section>
  );
}

export default MarcasGondola;
