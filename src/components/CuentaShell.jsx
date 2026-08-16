import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCuenta } from "../context/CuentaContext.jsx";
import styles from "./CuentaShell.module.css";

// Layout compartido de la cuenta del cliente: cabecera (volver + chip de usuario
// con menú) y navegación lateral. Cada página aporta su propio contenido como
// children, así el header y el nav dejan de estar copiados en cada pantalla.
const NAV = [
  { etiqueta: "Resumen", a: "/mi-cuenta" },
  { etiqueta: "Mis pedidos", a: "/mi-cuenta/pedidos" },
  { etiqueta: "Direcciones", a: "/mi-cuenta/direcciones" },
  { etiqueta: "Datos y seguridad", a: "/mi-cuenta/datos" },
];

export default function CuentaShell({ seccion, children }) {
  const { cliente, cerrarSesion } = useCuenta();
  const navegar = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const usuarioRef = useRef(null);
  const inicial = cliente?.nombre?.trim().charAt(0).toUpperCase() || "C";

  // Cerrar el menú al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alClic = (evento) => {
      if (!usuarioRef.current?.contains(evento.target)) setMenuAbierto(false);
    };
    const alTecla = (evento) => {
      if (evento.key === "Escape") setMenuAbierto(false);
    };
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTecla);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTecla);
    };
  }, [menuAbierto]);

  const salir = async () => {
    setCerrando(true);
    try {
      await cerrarSesion();
      navegar("/", { replace: true });
    } catch {
      setCerrando(false);
    }
  };

  return (
    <section className={styles.pantalla}>
      <header className={styles.cabecera}>
        <Link to="/" className={styles.volver}>
          <span aria-hidden="true">←</span> Volver a la tienda
        </Link>

        <div className={styles.usuario} ref={usuarioRef}>
          <button
            type="button"
            className={styles.chip}
            onClick={() => setMenuAbierto((valor) => !valor)}
            aria-haspopup="menu"
            aria-expanded={menuAbierto}
          >
            <span className={styles.avatar} aria-hidden="true">{inicial}</span>
            <span className={styles.chipNombre}>{cliente?.nombre ?? "Mi cuenta"}</span>
            <span className={styles.chipFlecha} aria-hidden="true">▾</span>
          </button>

          {menuAbierto && (
            <div className={styles.menu} role="menu">
              <Link to="/mi-cuenta" role="menuitem" onClick={() => setMenuAbierto(false)}>
                Mi cuenta
              </Link>
              <Link to="/mi-cuenta/datos" role="menuitem" onClick={() => setMenuAbierto(false)}>
                Datos y seguridad
              </Link>
              <button type="button" role="menuitem" className={styles.menuSalir} onClick={salir} disabled={cerrando}>
                {cerrando ? "Saliendo…" : "Salir"}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.cuerpo}>
        <aside className={styles.navegacion} aria-label="Secciones de mi cuenta">
          {NAV.map((item) =>
            item.etiqueta === seccion ? (
              <span key={item.a} className={styles.navActiva} aria-current="page">
                {item.etiqueta}
              </span>
            ) : (
              <Link key={item.a} to={item.a}>
                {item.etiqueta}
              </Link>
            ),
          )}
        </aside>
        {children}
      </div>
    </section>
  );
}
