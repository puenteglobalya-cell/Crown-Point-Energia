-- Varias FK quedaron sin ON DELETE CASCADE (RESTRICT es el default de
-- Postgres cuando no se especifica) — un borrado normal desde el simulador
-- (borrar un yacimiento, una concesión, un escenario) se iba a trabar con un
-- error crudo de FK en vez de arrastrar los hijos, como sí hacen la mayoría
-- de las otras FK de este esquema.
--
-- Se busca el nombre real de la constraint por catálogo en vez de asumir el
-- nombre default de Postgres (tabla_columna_fkey): dado que varias FK de
-- este esquema ya resultaron no coincidir entre el archivo de migración y
-- la base real (ver 20260804_fix_el_tordillo_nombre.sql y los comentarios
-- de cashflow_mensual/formulas_precio), no conviene asumir nada que se
-- pueda verificar.
do $$
declare
  fk record;
  fks text[][] := array[
    array['yacimientos', 'provincia_id', 'provincias'],
    array['concesiones', 'yacimiento_id', 'yacimientos'],
    array['pozos', 'concesion_id', 'concesiones'],
    array['intervenciones', 'concesion_id', 'concesiones'],
    array['opex_fijo_pozo', 'concesion_id', 'concesiones'],
    array['campanas', 'escenario_id', 'escenarios'],
    array['reservas_depletion_anual', 'escenario_id', 'escenarios'],
    array['reservas_depletion_anual', 'yacimiento_id', 'yacimientos']
  ];
  item text[];
  conname text;
begin
  foreach item slice 1 in array fks loop
    select c.conname into conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and t.relname = item[1]
      and a.attname = item[2]
      and array_length(c.conkey, 1) = 1;

    if conname is null then
      raise warning 'No encontré la FK de %.% -- revisar a mano', item[1], item[2];
      continue;
    end if;

    execute format('alter table %I drop constraint %I', item[1], conname);
    execute format(
      'alter table %I add constraint %I foreign key (%I) references %I(id) on delete cascade',
      item[1], conname, item[2], item[3]
    );
    raise notice '%.% -> % ahora es on delete cascade', item[1], item[2], item[3];
  end loop;
end $$;
