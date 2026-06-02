-- ── Tipo de reporte: Informe de Seguimiento (Accionista) ────────
-- Ejecutar en Supabase → SQL Editor

insert into report_types (id, nombre, descripcion, parser)
values ('accionista', 'Informe de Seguimiento', 'Cash flow operativo + comercial (PPTX)', 'accionista')
on conflict (id) do nothing;

-- Ampliar columna periodo para aceptar rangos "Ene-26 | Abr-26"
alter table reportes
  alter column periodo type text;

-- Índice por tipo (por si no existía)
create index if not exists idx_reportes_tipo on reportes(type_id);
