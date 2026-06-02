-- ── Acceso por tipo de reporte ──────────────────────────────
-- Ejecutar en Supabase → SQL Editor
-- Define qué rol puede ver / subir cada tipo de reporte.
-- Si un rol no figura, NO tiene acceso a ese tipo.

create table if not exists report_type_access (
  type_id    text not null references report_types(id) on delete cascade,
  role       text not null,          -- 'viewer' | 'uploader' | 'admin' | 'rrhh'
  can_view   boolean not null default true,
  can_upload boolean not null default false,
  updated_at timestamptz default now(),
  primary key (type_id, role)
);

alter table report_type_access enable row level security;

-- Solo admins pueden leer y modificar esta tabla
drop policy if exists "Admin full access report_type_access" on report_type_access;
create policy "Admin full access report_type_access"
  on report_type_access for all
  to authenticated
  using (auth.jwt() ->> 'email' = any(
    array['mezquieta@crownpointenergy.com']
  ));

-- ── Datos por defecto ─────────────────────────────────────────
-- ingresos: todos pueden ver; uploaders y admins pueden subir
-- accionista: solo admins por defecto
-- produccion: igual que ingresos
-- financiero: solo admins por defecto

insert into report_types (id, nombre, descripcion, parser)
values ('accionista', 'Informe de Seguimiento', 'Cash flow operativo + comercial (PPTX)', 'accionista')
on conflict (id) do nothing;

insert into report_type_access (type_id, role, can_view, can_upload) values
  ('ingresos',   'viewer',   true,  false),
  ('ingresos',   'uploader', true,  true),
  ('ingresos',   'admin',    true,  true),
  ('accionista', 'viewer',   false, false),
  ('accionista', 'uploader', false, false),
  ('accionista', 'admin',    true,  true),
  ('produccion', 'viewer',   true,  false),
  ('produccion', 'uploader', true,  true),
  ('produccion', 'admin',    true,  true),
  ('financiero', 'viewer',   false, false),
  ('financiero', 'uploader', false, false),
  ('financiero', 'admin',    true,  true)
on conflict (type_id, role) do nothing;
