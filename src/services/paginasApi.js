const apiUrlPorDefecto = () => import.meta.env.VITE_API_URL;

export class ErrorPaginasApi extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.status = status;
  }
}

// El contenido editorial no tiene fallback: si la API no lo entrega, preferimos
// mostrar un estado honesto antes que publicar texto local desactualizado.
export async function obtenerPaginaPublica(
  slug,
  { fetchImpl = fetch, apiUrl = apiUrlPorDefecto() } = {},
) {
  if (!apiUrl) {
    throw new ErrorPaginasApi("El contenido no está disponible en este momento.", {
      status: 503,
    });
  }

  try {
    const respuesta = await fetchImpl(
      `${apiUrl.replace(/\/$/, "")}/paginas/${encodeURIComponent(slug)}`,
    );

    if (!respuesta.ok) {
      let mensaje = respuesta.status === 404
        ? "No encontramos la página que buscas."
        : "No pudimos cargar esta información.";

      try {
        const datos = await respuesta.json();
        if (datos?.error?.message) mensaje = datos.error.message;
      } catch {
        // Una respuesta no JSON conserva el mensaje seguro anterior.
      }

      throw new ErrorPaginasApi(mensaje, { status: respuesta.status });
    }

    const datos = await respuesta.json();
    if (!datos?.data?.titulo || typeof datos.data.cuerpo !== "string") {
      throw new ErrorPaginasApi("No pudimos cargar esta información.", { status: 502 });
    }
    return datos.data;
  } catch (error) {
    if (error instanceof ErrorPaginasApi) throw error;
    throw new ErrorPaginasApi("No pudimos conectar con el servidor. Intenta nuevamente.", {
      status: 503,
    });
  }
}
