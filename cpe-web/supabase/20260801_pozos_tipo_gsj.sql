-- ============================================================
-- Pozos tipo del Golfo San Jorge — las 4 curvas base
-- ============================================================
-- Definiciones confirmadas por el cliente:
--
--   GSJ_CH   → El Tordillo, resto de proyectos de ET     · curva básica
--   GSJ_PQO  → Puesto Quiroga                            · curva básica
--   GSJ_BLG  → Bloque G                                  · curva básica
--   GSJ_WO   → El Tordillo, workovers                    · categoría workover
--
-- ET = El Tordillo. La concesión es "El Tordillo, La Tapera y Puesto Quiroga"
-- (LTPQ), Chubut, cuenca del Golfo San Jorge.
--
-- GSJ_WO no es un yacimiento sino una categoría de intervención sobre El
-- Tordillo, por eso comparte yacimiento con GSJ_CH y se distingue por
-- pozos_tipo.categoria = 'workover'.
--
-- Este script sólo crea los registros de pozos_tipo. Las curvas mensuales se
-- cargan después, desde la pantalla del simulador: importando el Excel o
-- generándolas con el generador de declinación de Arps.

-- Los yacimientos tienen que existir antes. Si alguno falta, el insert
-- correspondiente no hace nada y hay que crearlo primero en la sección
-- "Yacimientos" del simulador.
do $$
declare
  faltantes text;
begin
  select string_agg(n, ', ') into faltantes
  from (values ('El Tordillo'), ('Puesto Quiroga'), ('Bloque G')) as v(n)
  where not exists (select 1 from yacimientos y where y.nombre = v.n);

  if faltantes is not null then
    raise warning 'Yacimientos que faltan crear antes de correr este script: %', faltantes;
  end if;
end $$;

insert into pozos_tipo (nombre, yacimiento_id, categoria)
select v.nombre, y.id, v.categoria
from (values
  ('GSJ_CH',  'El Tordillo',    'basico'),
  ('GSJ_PQO', 'Puesto Quiroga', 'basico'),
  ('GSJ_BLG', 'Bloque G',       'basico'),
  ('GSJ_WO',  'El Tordillo',    'workover')
) as v(nombre, yacimiento, categoria)
join yacimientos y on y.nombre = v.yacimiento
where not exists (select 1 from pozos_tipo pt where pt.nombre = v.nombre);
