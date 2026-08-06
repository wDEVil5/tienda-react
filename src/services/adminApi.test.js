import { describe, expect, it, vi } from "vitest";
import {
  archivarProductoAdmin,
  actualizarProductoAdmin,
  crearProductoAdmin,
  ErrorAdminApi,
  iniciarSesionAdmin,
  listarProductosAdmin,
  obtenerOpcionesProductoAdmin,
  reemplazarImagenesProductoAdmin,
  subirImagenProductoAdmin,
  obtenerProductoAdmin,
  obtenerSesionAdmin,
  restablecerContrasenaConTokenAdmin,
  solicitarRecuperacionAdmin,
} from "./adminApi.js";

describe("adminApi", () => {
  it("consulta la sesión administrativa enviando la cookie", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { usuario: { id: "usr_1", rol: "ADMIN" } } }),
    });

    await expect(
      obtenerSesionAdmin({ fetchImpl, apiUrl: "http://localhost:3000/api" }),
    ).resolves.toEqual({ id: "usr_1", rol: "ADMIN" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/me",
      { method: "GET", credentials: "include" },
    );
  });

  it("trata un 401 de sesión como visitante", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "AUTH_REQUIRED", message: "Debes iniciar sesión." },
      }),
    });

    await expect(
      obtenerSesionAdmin({ fetchImpl, apiUrl: "http://localhost:3000/api" }),
    ).resolves.toBeNull();
  });

  it("solicita la recuperación de contraseña del staff", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ data: { mensaje: "Si el correo está registrado…" } }),
    });

    await solicitarRecuperacionAdmin("ana@correo.cl", {
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/contrasena/recuperacion",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "ana@correo.cl" }),
      }),
    );
  });

  it("restablece la contraseña del staff con el token del enlace", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
    });

    await restablecerContrasenaConTokenAdmin("tok-abc", "ClaveLarga123", {
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/contrasena/restablecer",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "tok-abc", contrasenaNueva: "ClaveLarga123" }),
      }),
    );
  });

  it("inicia sesión con el contrato real de personal", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { usuario: { nombre: "Wilnes", rol: "ADMIN" } } }),
    });

    const credenciales = { email: "admin@sumarket.cl", contrasena: "secreto" };
    await iniciarSesionAdmin(credenciales, {
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/login",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credenciales),
      },
    );
  });

  it("envía búsqueda, estado y paginación al listado de productos", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "prod_1", nombre: "Aceite" }],
        meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
      }),
    });

    const resultado = await listarProductosAdmin({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
      page: 2,
      busqueda: " aceite ",
      estado: "PUBLICADO",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/productos?page=2&limit=20&q=aceite&estado=PUBLICADO",
      { method: "GET", credentials: "include" },
    );
    expect(resultado.meta.total).toBe(21);
  });

  it("consulta el detalle de un producto para edición", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "prod/1", nombre: "Aceite" } }),
    });

    await expect(
      obtenerProductoAdmin("prod/1", {
        fetchImpl,
        apiUrl: "http://localhost:3000/api",
      }),
    ).resolves.toEqual({ id: "prod/1", nombre: "Aceite" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/productos/prod%2F1",
      { method: "GET", credentials: "include" },
    );
  });

  it("crea un producto enviando el payload JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "prod_2" } }),
    });
    const producto = {
      nombre: "Aceite de oliva",
      sku: "ACE-500",
      descripcion: "Aceite extra virgen",
      precio: 15980,
      stock: 4,
      categoriaId: "cat_1",
      marcaId: "marca_1",
    };

    await expect(
      crearProductoAdmin(producto, {
        fetchImpl,
        apiUrl: "http://localhost:3000/api",
      }),
    ).resolves.toEqual({ id: "prod_2" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/productos",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producto),
      },
    );
  });

  it("consulta las referencias necesarias para el editor", async () => {
    const referencias = {
      categorias: [{ id: "cat_1", nombre: "Despensa" }],
      marcas: [{ id: "marca_1", nombre: "Acme" }],
      etiquetas: [{ id: "tag_1", nombre: "Oferta" }],
    };
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: referencias }),
    });

    await expect(
      obtenerOpcionesProductoAdmin({
        fetchImpl,
        apiUrl: "http://localhost:3000/api",
      }),
    ).resolves.toEqual(referencias);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/referencias/producto",
      { method: "GET", credentials: "include" },
    );
  });

  it("actualiza y archiva un producto por id", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "prod_1" } }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });

    await actualizarProductoAdmin("prod_1", { stock: 8 }, {
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });
    await archivarProductoAdmin("prod_1", {
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/admin/productos/prod_1",
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: 8 }),
      },
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/admin/productos/prod_1",
      { method: "DELETE", credentials: "include" },
    );
  });

  it("sube una imagen como multipart y reemplaza el orden de la galería", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { url: "https://img.test/aceite.webp", storageKey: "productos/1" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "prod_1", imagenes: [] } }) });
    const archivo = new File(["imagen"], "aceite.webp", { type: "image/webp" });

    await subirImagenProductoAdmin(archivo, { fetchImpl, apiUrl: "http://localhost:3000/api" });
    await reemplazarImagenesProductoAdmin("prod_1", [{ url: "https://img.test/aceite.webp", storageKey: "productos/1" }], {
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    const [, opcionesSubida] = fetchImpl.mock.calls[0];
    expect(opcionesSubida.method).toBe("POST");
    expect(opcionesSubida.credentials).toBe("include");
    expect(opcionesSubida.body).toBeInstanceOf(FormData);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/admin/productos/prod_1/imagenes",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ imagenes: [{ url: "https://img.test/aceite.webp", storageKey: "productos/1" }] }),
      }),
    );
  });

  it("normaliza una caída de red como error accionable del panel", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(listarProductosAdmin({ fetchImpl, apiUrl: "http://localhost:3000/api" })).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: expect.stringContaining("API del panel"),
    });
  });

  it("conserva código y estado de los errores del backend", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: { code: "FORBIDDEN", message: "No tienes permisos." },
      }),
    });

    await expect(
      listarProductosAdmin({ fetchImpl, apiUrl: "http://localhost:3000/api" }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "No tienes permisos.",
        code: "FORBIDDEN",
        status: 403,
      }),
    );
  });

  it("informa con claridad cuando no existe URL de API", async () => {
    await expect(listarProductosAdmin({ apiUrl: "" })).rejects.toBeInstanceOf(
      ErrorAdminApi,
    );
  });
});
