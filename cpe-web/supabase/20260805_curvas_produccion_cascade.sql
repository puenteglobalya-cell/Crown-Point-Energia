-- curvas_produccion.pozo_tipo_id declara "on delete cascade" en el archivo
-- de esquema (20260730_reservas_base.sql), pero la tabla real quedó con el
-- default de Postgres (RESTRICT) -- mismo patrón que ya se repitió varias
-- veces hoy (cashflow_mensual, formulas_precio, etc.): la tabla existía de
-- antes y "create table if not exists" nunca la actualizó. Borrar un pozo
-- tipo con curvas cargadas se traba con un error crudo de FK en vez de
-- arrastrarlas.
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  where c.contype = 'f'
    and t.relname = 'curvas_produccion'
    and a.attname = 'pozo_tipo_id'
    and array_length(c.conkey, 1) = 1;

  if conname is null then
    raise warning 'No encontré la FK de curvas_produccion.pozo_tipo_id -- revisar a mano';
    return;
  end if;

  execute format('alter table curvas_produccion drop constraint %I', conname);
  execute format(
    'alter table curvas_produccion add constraint %I foreign key (pozo_tipo_id) references pozos_tipo(id) on delete cascade',
    conname
  );
  raise notice 'curvas_produccion.pozo_tipo_id -> pozos_tipo ahora es on delete cascade';
end $$;
