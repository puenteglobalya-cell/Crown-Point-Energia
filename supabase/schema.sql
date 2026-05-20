-- ─────────────────────────────────────────────────────────────
-- revenue-app · Schema
-- Ejecutar en Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- Tipos de reporte disponibles en la app
create table if not exists report_types (
  id         text primary key,           -- 'ingresos', 'produccion', 'financiero'
  nombre     text not null,
  descripcion text,
  parser     text,                       -- qué parser usar: 'ingresos_mensual', 'custom'
  activo     boolean default true,
  created_at timestamptz default now()
);

-- Reportes subidos (un registro por archivo)
create table if not exists reportes (
  id            uuid primary key default gen_random_uuid(),
  type_id       text references report_types(id),
  titulo        text not null,            -- 'Ingresos Mayo 2026'
  periodo       text not null,            -- '2026-05'
  fecha_reporte date,
  storage_path  text,                     -- ruta en Supabase Storage
  datos         jsonb,                    -- datos parseados del Excel
  estado        text default 'borrador',  -- 'borrador' | 'publicado'
  subido_por    uuid references auth.users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Índices
create index if not exists idx_reportes_tipo    on reportes(type_id);
create index if not exists idx_reportes_periodo on reportes(periodo);
create index if not exists idx_reportes_estado  on reportes(estado);

-- ── RLS (Row Level Security) ────────────────────────────────
alter table report_types enable row level security;
alter table reportes      enable row level security;

-- Todos los usuarios autenticados pueden leer reportes publicados
drop policy if exists "Leer reportes publicados" on reportes;
create policy "Leer reportes publicados"
  on reportes for select
  to authenticated
  using (estado = 'publicado');

-- Solo admins pueden insertar / actualizar / ver borradores
drop policy if exists "Admins full access" on reportes;
create policy "Admins full access"
  on reportes for all
  to authenticated
  using (
    auth.jwt() ->> 'email' = any(
      array['mezquieta@crownpointenergy.com']
    )
  );

drop policy if exists "Leer tipos de reporte" on report_types;
create policy "Leer tipos de reporte"
  on report_types for select
  to authenticated
  using (activo = true);

-- ── STORAGE BUCKET ──────────────────────────────────────────
-- Crear en Supabase → Storage → New bucket
-- Nombre: "reportes" · Private: true

-- Política de storage: solo admins pueden subir
-- (configurar desde Supabase → Storage → Policies)

-- ── DATOS INICIALES ─────────────────────────────────────────
insert into report_types (id, nombre, descripcion, parser) values
  ('ingresos',    'Ingresos Estimados',    'Revenue mensual petróleo & gas', 'ingresos_mensual'),
  ('produccion',  'Reporte de Producción', 'Volúmenes y pozos por área',     'custom'),
  ('financiero',  'Reporte Financiero',    'P&L y balance',                  'custom')
on conflict (id) do nothing;
