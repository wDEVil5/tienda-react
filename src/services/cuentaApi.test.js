import { describe, expect, it, vi } from "vitest";
import {
  cerrarSesionCuenta,
  crearDireccionCuenta,
  actualizarDireccionCuenta,
  actualizarPerfilCuenta,
  cambiarContrasenaCuenta,
  eliminarDireccionCuenta,
  iniciarSesionCuenta,
  listarDireccionesCuenta,
  listarPedidosCuenta,
  obtenerPedidoCuenta,
  obtenerCuenta,
  registrarCuenta,
} from "./cuentaApi.js";

describe("cuentaApi", () => {
  it("consulta la sesión enviando la cookie httpOnly", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { cliente: { id: "c1", nombre: "Wilnes" } } }),
    });

    const cliente = await obtenerCuenta({
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/cuenta",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(cliente).toEqual({ id: "c1", nombre: "Wilnes" });
  });

  it("consulta un pedido solo mediante la sesión actual", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "pedido-1" } }),
    });

    await expect(obtenerPedidoCuenta("pedido-1", {
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    })).resolves.toEqual({ id: "pedido-1" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/cuenta/pedidos/pedido-1",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("actualiza y elimina una dirección usando su identificador técnico", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "d1" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => null });
    const opciones = { fetchImpl, apiUrl: "http://localhost:3000/api" };
    const datos = { calle: "Av. Matta 980", comuna: "Santiago", region: "RM" };

    await actualizarDireccionCuenta("d1", datos, opciones);
    await eliminarDireccionCuenta("d1", opciones);

    expect(fetchImpl.mock.calls.map(([url, config]) => [url, config.method])).toEqual([
      ["http://localhost:3000/api/cuenta/direcciones/d1", "PATCH"],
      ["http://localhost:3000/api/cuenta/direcciones/d1", "DELETE"],
    ]);
  });

  it("actualiza el perfil sin enviar una identidad de cliente", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { cliente: { id: "c1", nombre: "Wilnes A." } } }),
    });

    await expect(actualizarPerfilCuenta(
      { nombre: "Wilnes A.", telefono: "+56 9 1234 5678" },
      { fetchImpl, apiUrl: "http://localhost:3000/api" },
    )).resolves.toEqual({ cliente: { id: "c1", nombre: "Wilnes A." } });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/cuenta/perfil",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ nombre: "Wilnes A.", telefono: "+56 9 1234 5678" }),
      }),
    );
  });

  it("cambia la contraseña con la sesión actual", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => null });
    const datos = { contrasenaActual: "Cliente2026!", contrasenaNueva: "Nueva clave segura 2026" };

    await expect(cambiarContrasenaCuenta(datos, {
      fetchImpl,
      apiUrl: "http://localhost:3000/api",
    })).resolves.toBeNull();

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/cuenta/contrasena",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify(datos),
      }),
    );
  });

  it("lista recursos privados sin exponer ni enviar el id del cliente", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: "d1" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
    const opciones = { fetchImpl, apiUrl: "http://localhost:3000/api" };

    await listarDireccionesCuenta(opciones);
    await crearDireccionCuenta({ calle: "Av. Matta 980", comuna: "Santiago", region: "RM" }, opciones);
    await listarPedidosCuenta({ page: 2, limit: 12, ...opciones });

    expect(fetchImpl.mock.calls.map(([url, config]) => [url, config.credentials])).toEqual([
      ["http://localhost:3000/api/cuenta/direcciones", "include"],
      ["http://localhost:3000/api/cuenta/direcciones", "include"],
      ["http://localhost:3000/api/cuenta/pedidos?page=2&limit=12", "include"],
    ]);
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ calle: "Av. Matta 980", comuna: "Santiago", region: "RM" }),
    });
  });

  it("trata un 401 como visitante sin sesión", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "AUTH_REQUIRED" } }),
    });

    await expect(
      obtenerCuenta({ fetchImpl, apiUrl: "http://localhost:3000/api" }),
    ).resolves.toBeNull();
  });

  it("registra, inicia y cierra sesión con los métodos de la API", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { cliente: { id: "c1" } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { cliente: { id: "c1" } } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => null });
    const opciones = { fetchImpl, apiUrl: "http://localhost:3000/api" };

    await registrarCuenta({ nombre: "Wilnes", email: "w@e.cl", contrasena: "UnaClaveSegura1" }, opciones);
    await iniciarSesionCuenta({ email: "w@e.cl", contrasena: "UnaClaveSegura1" }, opciones);
    await cerrarSesionCuenta(opciones);

    expect(fetchImpl.mock.calls.map(([url, config]) => [url, config.method])).toEqual([
      ["http://localhost:3000/api/cuenta/registro", "POST"],
      ["http://localhost:3000/api/cuenta/login", "POST"],
      ["http://localhost:3000/api/cuenta/logout", "POST"],
    ]);
  });
});
