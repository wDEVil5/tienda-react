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

export default function AdminShell({ usuario, children }) {
  return (
    <div className={styles.pantalla}>
      <aside className={styles.sidebar} aria-label="Navegación administrativa">
        <a className={styles.marca} href={`${import.meta.env.BASE_URL}admin/productos`}>
          Sumarket<em>Admin</em>
        </a>

        <nav className={styles.navegacion}>
          {SECCIONES.map((seccion) => {
            const activa = seccion === "Productos";
            return (
              <button
                key={seccion}
                className={activa ? styles.enlaceActivo : styles.enlacePendiente}
                type="button"
                aria-current={activa ? "page" : undefined}
                disabled={!activa}
                title={activa ? undefined : `${seccion} se implementará en una próxima entrega.`}
              >
                {seccion}
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
