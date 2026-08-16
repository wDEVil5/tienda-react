-- Seguridad: activa Row Level Security (RLS) en TODAS las tablas del esquema
-- public, sin definir ninguna política ("deny-all").
--
-- Por qué esto no rompe el backend:
--   * El backend (Prisma) se conecta como el rol dueño de las tablas (postgres,
--     que las creó en estas migraciones). En PostgreSQL, el dueño queda EXENTO
--     de RLS mientras no se use FORCE ROW LEVEL SECURITY -> acceso total intacto.
--   * La API REST pública de Supabase (PostgREST) usa los roles anon/authenticated.
--     Con RLS activo y CERO políticas, esos roles no ven ninguna fila: bloqueado.
--
-- IMPORTANTE: no usar FORCE aquí; forzar RLS también sujetaría al dueño y
-- rompería el acceso del backend.
--
-- Mantenimiento: cada tabla NUEVA que agregue Prisma debe incluir su propio
-- "ALTER TABLE ... ENABLE ROW LEVEL SECURITY;" en la migración que la crea.

-- _prisma_migrations la gestiona Prisma y NO existe en la base sombra que usa
-- `prisma migrate dev`; por eso se guarda para aplicarse solo donde exista (prod).
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
ALTER TABLE public.atributos_categoria  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_stock         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_tienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direcciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etiquetas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_pedido       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identidad_tienda     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_pedido         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opciones_atributo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paginas_contenido    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_atributos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_etiquetas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_imagenes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocion_productos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promociones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_cliente     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategorias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategorias_hijas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscriptores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifas_comuna       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens_recuperacion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios             ENABLE ROW LEVEL SECURITY;
