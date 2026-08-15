import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./BannerCarrusel.module.css";
import { obtenerBanners } from "../services/bannersApi.js";

const AVANCE_MS = 6000;

// Envuelve la imagen según el enlace del banner: ruta interna → Link (SPA), URL
// externa → <a> en pestaña nueva, sin enlace → contenedor plano no clicable.
function Diapositiva({ banner }) {
  const imagen = (
    <img className={styles.imagen} src={banner.imagenUrl} alt={banner.titulo} draggable={false} />
  );

  if (!banner.enlace) return <div className={styles.slide}>{imagen}</div>;

  const esExterno = /^https?:\/\//i.test(banner.enlace);
  if (esExterno) {
    return (
      <a className={styles.slide} href={banner.enlace} target="_blank" rel="noreferrer">
        {imagen}
      </a>
    );
  }
  return (
    <Link className={styles.slide} to={banner.enlace}>
      {imagen}
    </Link>
  );
}

// Carrusel de banners de portada (estilo supermercado): imagen a lo ancho,
// flechas laterales, puntos y auto-avance con pausa al pasar el mouse. Si no hay
// banners, renderiza `fallback` (el hero) para que la portada no quede vacía.
function BannerCarrusel({ fallback = null }) {
  const [banners, setBanners] = useState(null); // null = cargando
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerBanners().then((respuesta) => {
      if (vigente) setBanners(respuesta ?? []);
    });
    return () => { vigente = false; };
  }, []);

  const total = banners?.length ?? 0;

  // Auto-avance: solo con 2+ banners y sin pausa. El updater funcional evita
  // depender de `indice`, así el intervalo no se reinicia en cada paso.
  useEffect(() => {
    if (total <= 1 || pausado) return undefined;
    const id = setInterval(() => setIndice((i) => (i + 1) % total), AVANCE_MS);
    return () => clearInterval(id);
  }, [total, pausado]);

  // Mientras carga no mostramos nada (evita un salto de layout); sin banners,
  // cae al hero.
  if (banners === null) return null;
  if (total === 0) return fallback;

  const irA = (i) => setIndice(((i % total) + total) % total);

  return (
    <section
      className={styles.carrusel}
      aria-roledescription="carrusel"
      aria-label="Promociones destacadas"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className={styles.marco}>
        <div className={styles.viewport}>
          <div className={styles.pista} style={{ transform: `translateX(-${indice * 100}%)` }}>
            {banners.map((banner) => (
              <Diapositiva key={banner.id} banner={banner} />
            ))}
          </div>
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              className={`${styles.flecha} ${styles.flechaIzq}`}
              onClick={() => irA(indice - 1)}
              aria-label="Banner anterior"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.flecha} ${styles.flechaDer}`}
              onClick={() => irA(indice + 1)}
              aria-label="Banner siguiente"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className={styles.puntos} role="tablist" aria-label="Elegir banner">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              role="tab"
              aria-selected={i === indice}
              aria-label={`Ir al banner ${i + 1}`}
              className={`${styles.punto} ${i === indice ? styles.puntoActivo : ""}`}
              onClick={() => irA(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default BannerCarrusel;
