-- ============================================================
-- Campañas de perforación con restricción de equipos
-- ============================================================
-- Objetivo de la simulación (definido por el cliente): la participación de CPE
-- en la concesión cambia de porcentaje en el tiempo, así que **cuándo** se
-- perfora cada pozo cambia el cash flow. Hay que poder mover el cronograma y
-- ver el efecto.
--
-- Hasta ahora la fecha de cada intervención se cargaba a mano, una por una, y
-- no existía la noción de equipo. Con una campaña se cargan los días de
-- perforación, los días de terminación y la cantidad de equipos, y el
-- cronograma se **deriva**: cada pozo se asigna al primer equipo que se libera.
--
--   1 equipo   → perforaciones escalonadas, una atrás de la otra
--   2 equipos  → dos pozos avanzan en paralelo, se solapan
--
-- Los defaults (12 días de perforación, 5 de terminación, 3 de mudanza) son
-- órdenes de magnitud de perforación VERTICAL CONVENCIONAL, que es el caso de
-- CPE: pozos en locaciones distintas, con mudanza del equipo entre pozo y
-- pozo. Son un punto de partida para que el cronograma no arranque con números
-- absurdos — hay que reemplazarlos por los de la campaña real.
--
-- Si además hay equipos de terminación separados de los de perforación, el
-- equipo de perforación se libera al terminar de perforar y pasa al pozo
-- siguiente mientras otro equipo termina el anterior (el solapamiento parcial
-- clásico). Si equipos_terminacion queda en NULL, el mismo equipo perfora y
-- termina, y el pozo lo ocupa todo el tiempo.

create table if not exists campanas (
    id                   bigint generated always as identity primary key,
    escenario_id         bigint references escenarios(id),
    nombre               text not null,
    fecha_inicio         date not null,
    equipos_perforacion  int  not null default 1 check (equipos_perforacion between 1 and 20),
    equipos_terminacion  int  check (equipos_terminacion is null or equipos_terminacion between 1 and 20),
    dias_perforacion     int  not null default 12 check (dias_perforacion > 0),
    dias_terminacion     int  not null default 5  check (dias_terminacion >= 0),
    dias_movilizacion    int  not null default 3  check (dias_movilizacion >= 0),
    notas                text,
    unique (escenario_id, nombre)
);

comment on table campanas is
  'Campaña de perforación. El cronograma se deriva de la cantidad de equipos y los días por etapa; no se cargan fechas pozo por pozo.';
comment on column campanas.equipos_terminacion is
  'Equipos de terminación separados. NULL = el mismo equipo perfora y termina (sin solapamiento entre etapas).';
comment on column campanas.dias_movilizacion is
  'Días de mudanza del equipo entre pozo y pozo. Ocupan el equipo, no el pozo.';

alter table campanas enable row level security;
create policy "reservas_service_role_all" on campanas for all using (auth.role() = 'service_role');

-- Las intervenciones pasan a poder pertenecer a una campaña. Cuando pertenecen,
-- su `fecha` la calcula el programador en lugar de cargarse a mano.
alter table intervenciones
  add column if not exists campana_id bigint references campanas(id) on delete set null,
  add column if not exists orden      int,
  add column if not exists fecha_inicio_perforacion date,
  add column if not exists dias_perforacion int,
  add column if not exists dias_terminacion int;

comment on column intervenciones.orden is
  'Posición en la secuencia de la campaña. El programador asigna los pozos a los equipos siguiendo este orden.';
comment on column intervenciones.fecha_inicio_perforacion is
  'Inicio de perforación, calculado por el programador. El CAPEX se imputa acá.';
comment on column intervenciones.fecha is
  'Primera producción (fin de la terminación). Es la fecha desde la que arranca la curva del pozo tipo.';
comment on column intervenciones.dias_perforacion is
  'Override de los días de perforación de la campaña, para un pozo puntual. NULL = usa el de la campaña.';

create index if not exists intervenciones_campana_idx on intervenciones (campana_id, orden);
