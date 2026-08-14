import { useNavigate } from "react-router-dom";
import {
  IconoClientes,
  IconoContenido,
  IconoEnvios,
  IconoEquipo,
  IconoIdentidad,
  IconoInventario,
  IconoPedidos,
  IconoProductos,
  IconoResumen,
} from "./iconosPanel.jsx";
import styles from "./AdminShell.module.css";

const ICONOS_SECCION = {
  Resumen: IconoResumen,
  Pedidos: IconoPedidos,
  Productos: IconoProductos,
  Inventario: IconoInventario,
  Clientes: IconoClientes,
  Identidad: IconoIdentidad,
  Envíos: IconoEnvios,
  Contenido: IconoContenido,
  Equipo: IconoEquipo,
};

const SECCIONES = [
  "Resumen",
  "Pedidos",
  "Productos",
  "Inventario",
  "Clientes",
  "Identidad",
  "Envíos",
  "Contenido",
];

// Secciones ya implementadas: su ítem del menú navega. El resto queda deshabilitado
// hasta su entrega.
const RUTAS = {
  Resumen: "/admin/resumen",
  Pedidos: "/admin/pedidos",
  Productos: "/admin/productos",
  Inventario: "/admin/inventario",
  Clientes: "/admin/clientes",
  Envíos: "/admin/envios",
  Equipo: "/admin/equipo",
};

export default function AdminShell({ usuario, seccion = "Productos", children }) {
  const navegar = useNavigate();

  // "Equipo" es solo para ADMIN (gestión de operadores); el resto lo ve todo el staff.
  const secciones = usuario.rol === "ADMIN" ? [...SECCIONES, "Equipo"] : SECCIONES;

  return (
    <div className={styles.pantalla}>
      <aside className={styles.sidebar} aria-label="Navegación administrativa">
        <a className={styles.marca} href={`${import.meta.env.BASE_URL}admin/resumen`}>
          Sumarket<em>Admin</em>
        </a>

        <button
          type="button"
          className={seccion === "Cuenta" ? styles.perfilChipActivo : styles.perfilChip}
          aria-current={seccion === "Cuenta" ? "page" : undefined}
          onClick={seccion === "Cuenta" ? undefined : () => navegar("/admin/cuenta")}
        >
          <span className={styles.perfilAvatar} aria-hidden="true">
            {usuario.nombre?.charAt(0).toUpperCase() ?? "?"}
          </span>
          <span className={styles.perfilInfo}>
            <span className={styles.perfilNombre}>{usuario.nombre}</span>
            <span className={styles.perfilRol}>{usuario.rol.toLowerCase()}</span>
          </span>
        </button>

        <nav className={styles.navegacion}>
          {secciones.map((nombre) => {
            const activa = nombre === seccion;
            const ruta = RUTAS[nombre];
            const disponible = Boolean(ruta);
            const clase = activa
              ? styles.enlaceActivo
              : disponible
                ? styles.enlace
                : styles.enlacePendiente;
            const Icono = ICONOS_SECCION[nombre];

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
                {Icono && <Icono className={styles.navIcono} />}
                <span>{nombre}</span>
              </button>
            );
          })}
        </nav>

        <a
          className={styles.tiendaCard}
          href={import.meta.env.BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={styles.tiendaEyebrow}>Tienda</span>
          <span className={styles.tiendaNombre}>SumarketExpress</span>
          <span className={styles.tiendaEstado}>
            <span className={styles.tiendaPunto} aria-hidden="true" />
            en línea
            <svg
              className={styles.tiendaFlecha}
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </span>
        </a>
      </aside>

      <section className={styles.contenido}>{children}</section>
    </div>
  );
}
