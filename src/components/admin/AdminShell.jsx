import { useNavigate } from "react-router-dom";
import styles from "./AdminShell.module.css";

const SECCIONES = [
  "Resumen",
  "Pedidos",
  "Productos",
  "Inventario",
  "Clientes",
  "Identidad",
  "Contenido",
];

// Secciones ya implementadas: su ítem del menú navega. El resto queda deshabilitado
// hasta su entrega.
const RUTAS = {
  Resumen: "/admin/resumen",
  Pedidos: "/admin/pedidos",
  Productos: "/admin/productos",
};

export default function AdminShell({ usuario, seccion = "Productos", children }) {
  const navegar = useNavigate();

  return (
    <div className={styles.pantalla}>
      <aside className={styles.sidebar} aria-label="Navegación administrativa">
        <a className={styles.marca} href={`${import.meta.env.BASE_URL}admin/productos`}>
          Sumarket<em>Admin</em>
        </a>

        <nav className={styles.navegacion}>
          {SECCIONES.map((nombre) => {
            const activa = nombre === seccion;
            const ruta = RUTAS[nombre];
            const disponible = Boolean(ruta);
            const clase = activa
              ? styles.enlaceActivo
              : disponible
                ? styles.enlace
                : styles.enlacePendiente;

            return (
              <button
                key={nombre}
                className={clase}
                type="button"
                aria-current={activa ? "page" : undefined}
                disabled={!disponible}
                title={disponible ? undefined : `${nombre} se implementará en una próxima entrega.`}
                onClick={disponible && !activa ? () => navegar(ruta) : undefined}
              >
                {nombre}
              </button>
            );
          })}
        </nav>

        <div className={styles.usuario}>
          <span>{usuario.nombre}</span>
          <span>rol: {usuario.rol.toLowerCase()}</span>
        </div>
      </aside>

      <section className={styles.contenido}>{children}</section>
    </div>
  );
}
