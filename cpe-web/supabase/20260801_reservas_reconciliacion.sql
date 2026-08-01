-- ============================================================
-- Reconciliación de reservas — las 7 categorías de NI 51-101
-- ============================================================
-- NI 51-101 exige explicar el cambio de reservas año contra año en categorías
-- definidas. El simulador tenía sólo una: producción. Un roll-forward de
-- apertura → producción → cierre no es una reconciliación, es una depleción.
--
-- Las siete categorías son:
--   producción · revisiones técnicas · extensiones y recuperación mejorada ·
--   descubrimientos · adquisiciones · cesiones · factores económicos
--
-- La producción la sigue calculando el motor a partir del cashflow. Las otras
-- seis se cargan a mano porque vienen del informe del evaluador (Sproule), no
-- de la simulación.

create table if not exists reservas_movimientos (
    id            bigint generated always as identity primary key,
    -- NULL = movimiento del reporte base, aplica a todos los escenarios.
    escenario_id  bigint references escenarios(id) on delete cascade,
    yacimiento_id bigint not null references yacimientos(id) on delete cascade,
    categoria     text not null check (categoria in ('P1','P2','P3')),
    anio          int  not null,
    tipo          text not null check (tipo in (
                    'revision_tecnica','extension_recuperacion_mejorada','descubrimiento',
                    'adquisicion','cesion','factores_economicos')),
    -- Con signo: una revisión a la baja o una cesión van en negativo.
    boe           numeric(16,2) not null,
    nota          text
);

comment on table reservas_movimientos is
  'Movimientos de reservas de las 6 categorías de NI 51-101 que no calcula el motor. La producción la aporta el cashflow.';
comment on column reservas_movimientos.boe is
  'Con signo. Negativo para revisiones a la baja, cesiones o factores económicos desfavorables.';

create index if not exists reservas_movimientos_idx
  on reservas_movimientos (yacimiento_id, categoria, anio);

alter table reservas_movimientos enable row level security;
create policy "reservas_service_role_all" on reservas_movimientos for all using (auth.role() = 'service_role');

-- El roll-forward pasa a tener una columna por categoría, de modo que
-- apertura + Σ movimientos − producción = cierre quede visible y auditable.
alter table reservas_depletion_anual
  add column if not exists revision_tecnica_boe      numeric(16,2) not null default 0,
  add column if not exists extension_boe             numeric(16,2) not null default 0,
  add column if not exists descubrimiento_boe        numeric(16,2) not null default 0,
  add column if not exists adquisicion_boe           numeric(16,2) not null default 0,
  add column if not exists cesion_boe                numeric(16,2) not null default 0,
  add column if not exists factores_economicos_boe   numeric(16,2) not null default 0;

comment on column reservas_depletion_anual.depletion_boe is
  'Producción del año imputada a esta categoría (cascada P1 → P2 → P3).';
