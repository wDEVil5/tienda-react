import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CuentaShell from "../components/CuentaShell.jsx";
import { useCuenta } from "../context/CuentaContext.jsx";
import { useRepetirPedido } from "../hooks/useRepetirPedido.js";
import { listarDireccionesCuenta, listarPedidosCuenta } from "../services/cuentaApi.js";
import styles from "./MiCuenta.module.css";

const ESTADOS_EN_CURSO = new Set(["PENDIENTE", "PREPARANDO", "LISTO_PARA_RETIRO", "ENVIADO"]);

const etiquetasEstado = {
  PENDIENTE: "pendiente",
  PREPARANDO: "en preparación",
  LISTO_PARA_RETIRO: "listo para retiro",
  ENVIADO: "enviada",
  ENTREGADO: "entregada",
  CANCELADO: "cancelada",
};

function formatearCLP(monto) {
  return `$${Number(monto ?? 0).toLocaleString("es-CL")}`;
}

function esDelMesActual(fecha) {
  const fechaPedido = new Date(fecha);
  const hoy = new Date();
  return (
    !Number.isNaN(fechaPedido.valueOf()) &&
    fechaPedido.getFullYear() === hoy.getFullYear() &&
    fechaPedido.getMonth() === hoy.getMonth()
  );
}

// Resumen (dashboard) de la cuenta: métricas, último pedido y dirección
// predeterminada. La gestión vive en sus propias secciones (Direcciones, Datos).
function MiCuenta() {
  const { cliente } = useCuenta();
  const { repetirPorId, repitiendoId } = useRepetirPedido();
  const [direcciones, setDirecciones] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    Promise.all([listarDireccionesCuenta(), listarPedidosCuenta()])
      .then(([direccionesCuenta, respuestaPedidos]) => {
        if (!vigente) return;
        setDirecciones(direccionesCuenta ?? []);
        setPedidos(respuestaPedidos?.data ?? []);
      })
      .catch(() => {
        if (vigente) setError("No pudimos cargar los datos de tu cuenta.");
      })
      .finally(() => {
        if (vigente) setCargandoDatos(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const resumen = useMemo(() => {
    const pedidosEnCurso = pedidos.filter((pedido) => ESTADOS_EN_CURSO.has(pedido.estado));
    const pedidosDelMes = pedidos.filter((pedido) => esDelMesActual(pedido.createdAt));
    const totalMes = pedidosDelMes.reduce((total, pedido) => total + pedido.total, 0);
    const ultimoPedido = [...pedidos].sort(
      (a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf(),
    )[0];
    return { pedidosEnCurso, pedidosDelMes, totalMes, ultimoPedido };
  }, [pedidos]);

  const inicial = cliente?.nombre?.trim().charAt(0).toUpperCase() || "C";
  const primerPedidoEnCurso = resumen.pedidosEnCurso[0];
  const direccionPredeterminada = direcciones.find((d) => d.predeterminada) ?? direcciones[0] ?? null;

  return (
    <CuentaShell seccion="Resumen">
      <div className={styles.contenido}>
        <div className={styles.perfil}>
          <div className={styles.avatar} aria-hidden="true">{inicial}</div>
          <div>
            <h1 id="titulo-cuenta">{cliente?.nombre}</h1>
            <p>Cuenta activa · {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}</p>
          </div>
          <Link className={styles.accionEditar} to="/mi-cuenta/datos">Editar datos</Link>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.metricas} aria-busy={cargandoDatos}>
          <article className={styles.metrica}>
            <p className={styles.eyebrow}>En curso</p>
            <strong>{resumen.pedidosEnCurso.length}</strong>
            <span>
              {primerPedidoEnCurso
                ? `#SE-${primerPedidoEnCurso.numero} ${etiquetasEstado[primerPedidoEnCurso.estado] ?? "en curso"}`
                : "Sin pedidos en curso"}
            </span>
          </article>
          <article className={styles.metrica}>
            <p className={styles.eyebrow}>Gastado este mes</p>
            <strong>{formatearCLP(resumen.totalMes)}</strong>
            <span>{resumen.pedidosDelMes.length} {resumen.pedidosDelMes.length === 1 ? "pedido" : "pedidos"}</span>
          </article>
          <article className={styles.metrica}>
            <p className={styles.eyebrow}>Total de pedidos</p>
            <strong>{pedidos.length}</strong>
            <span>Desde que creaste tu cuenta</span>
          </article>
        </div>

        <section className={styles.seccion} aria-labelledby="titulo-ultimo-pedido">
          <div className={styles.seccionCabecera}>
            <h2 id="titulo-ultimo-pedido">Tu último pedido</h2>
            <Link className={styles.accionEditar} to="/mi-cuenta/pedidos">Ver todos</Link>
          </div>
          {resumen.ultimoPedido ? (
            <div className={styles.ultimoPedido}>
              <div>
                <strong>#SE-{resumen.ultimoPedido.numero}</strong>
                <span>
                  {etiquetasEstado[resumen.ultimoPedido.estado] ?? "registrada"} · {formatearCLP(resumen.ultimoPedido.total)}
                </span>
              </div>
              <div className={styles.ultimoPedidoAcciones}>
                {resumen.ultimoPedido.estado !== "CANCELADO" && (
                  <button
                    type="button"
                    className={styles.repetirResumen}
                    onClick={() => repetirPorId(resumen.ultimoPedido.id)}
                    disabled={repitiendoId === resumen.ultimoPedido.id}
                  >
                    {repitiendoId === resumen.ultimoPedido.id ? "Agregando…" : "Repetir"}
                  </button>
                )}
                <Link className={styles.verMas} to={`/mi-cuenta/pedidos/${resumen.ultimoPedido.id}`}>
                  Ver detalle →
                </Link>
              </div>
            </div>
          ) : (
            <p className={styles.sinDatos}>
              Aún no tienes pedidos. <Link to="/">Ir a comprar</Link>
            </p>
          )}
        </section>

        <section className={styles.seccion} aria-labelledby="titulo-direccion-predeterminada">
          <div className={styles.seccionCabecera}>
            <h2 id="titulo-direccion-predeterminada">Dirección predeterminada</h2>
            <Link className={styles.accionEditar} to="/mi-cuenta/direcciones">Gestionar</Link>
          </div>
          {direccionPredeterminada ? (
            <div className={styles.direccionResumen}>
              <strong>{direccionPredeterminada.etiqueta || "Dirección"}</strong>
              <p>{[direccionPredeterminada.calle, direccionPredeterminada.depto].filter(Boolean).join(", ")}</p>
              <p>{[direccionPredeterminada.comuna, direccionPredeterminada.region].filter(Boolean).join(", ")}</p>
            </div>
          ) : (
            <p className={styles.sinDatos}>
              No tienes una dirección guardada. <Link to="/mi-cuenta/direcciones">Agregar dirección</Link>
            </p>
          )}
        </section>
      </div>
    </CuentaShell>
  );
}

export default MiCuenta;
