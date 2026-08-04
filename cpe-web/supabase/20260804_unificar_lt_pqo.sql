-- Unifica "La tapera" y "Puesto Quiroga" en un solo yacimiento "LT_PQO".
-- Participación era idéntica en las dos (0.95 y 0.7864 en ambas). Regalía
-- SÍ difería (La tapera 17%, Puesto Quiroga 6%) — es una bifurcación real,
-- no un error de carga. Definido: unificar en una sola alícuota promedio
-- = (0.17 + 0.06) / 2 = 0.115 (11.5%).

-- Paso 1 — la concesión que sobrevive es "Puesto Quiroga" (pozos_tipo.GSJ_PQO
-- ya apunta a su yacimiento, no hace falta tocar esa referencia). Le
-- actualizamos la regalía a la alícuota promedio.
update regalias
set porcentaje = 0.115
where concesion_id = (select id from concesiones where nombre = 'Puesto Quiroga');

-- Paso 2 — renombra el yacimiento y la concesión sobreviviente a "LT_PQO".
update yacimientos set nombre = 'LT_PQO' where nombre = 'Puesto Quiroga';
update concesiones set nombre = 'LT_PQO' where nombre = 'Puesto Quiroga';

-- Paso 3 — "La tapera" queda sin usar: borra su participación, regalía,
-- concesión y yacimiento.
delete from concesion_participacion where concesion_id = (select id from concesiones where nombre = 'La tapera');
delete from regalias where concesion_id = (select id from concesiones where nombre = 'La tapera');
delete from concesiones where nombre = 'La tapera';
delete from yacimientos where nombre = 'La tapera';
