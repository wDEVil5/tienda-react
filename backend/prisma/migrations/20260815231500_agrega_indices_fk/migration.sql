-- Rendimiento: índices en columnas de clave foránea que no estaban cubiertas
-- por ningún índice existente. Sin ellos, borrar el lado referenciado (o filtrar
-- por esa FK) obliga a un scan completo de la tabla.
--
--   * movimientos_stock.usuario_id  (SetNull al borrar un usuario)
--   * producto_atributos.opcion_id  (Cascade al borrar una opción)
--   * productos.subcategoria_id      (SetNull al borrar una subcategoría)
--
-- Las demás FK de estas tablas ya estaban cubiertas por el prefijo izquierdo de
-- un índice compuesto o del PK.

-- CreateIndex
CREATE INDEX "movimientos_stock_usuario_id_idx" ON "movimientos_stock"("usuario_id");

-- CreateIndex
CREATE INDEX "producto_atributos_opcion_id_idx" ON "producto_atributos"("opcion_id");

-- CreateIndex
CREATE INDEX "productos_subcategoria_id_idx" ON "productos"("subcategoria_id");
