-- ============================================================
-- 4 gaps encontrados al comparar el schema con el Excel de referencia
-- (2024 estimación de flujos PC-KK.xlsx)
-- ============================================================

-- 1. Tarifa de almacenamiento — deducción adicional al precio neto,
--    además del diferencial de cuenca que ya cubre formulas_precio.
--    Aproximación de primera pasada: tarifa USD/m3/día × días de
--    almacenamiento, convertido a USD/bbl con un factor de conversión
--    ajustable. Validar el resultado contra el Excel y ajustar el
--    factor si no coincide.
alter table formulas_precio
  add column if not exists tarifa_almacenamiento_usd_m3_dia numeric(10,6) default 0,
  add column if not exists dias_almacenamiento numeric(6,2) default 0,
  add column if not exists factor_m3_a_bbl numeric(10,6) default 6.2898;

-- 2. OPEX fijo por pozo — el Excel reparte cada categoría de costo en
--    Fijo (por concesión) / Variable (USD/BOE) / Fijo Pozo (fijo por
--    pozo activo, no por concesión). Los primeros dos ya existían
--    (opex_fijo, opex_variable); falta el tercero.
create table if not exists opex_fijo_pozo (
    id             bigint generated always as identity primary key,
    concesion_id   bigint not null references concesiones(id),
    fecha_desde    date not null,
    fecha_hasta    date,
    usd_mes_pozo   numeric(12,2) not null,
    concepto       text,
    unique (concesion_id, fecha_desde, concepto),
    check (fecha_hasta is null or fecha_hasta > fecha_desde)
);
alter table opex_fijo_pozo enable row level security;
create policy "reservas_service_role_all" on opex_fijo_pozo for all using (auth.role() = 'service_role');

alter table cashflow_mensual
  add column if not exists opex_fijo_pozo_usd numeric(16,2) not null default 0;

-- 3. Subtipo de intervención — el Excel distingue perforación/workover
--    de inyección vs. producción (PERF_INY, PERF_PROD, WO_INY, WO_PROD,
--    WO_CONV). No afecta el cálculo de cashflow hoy, pero permite
--    reportar el detalle de campaña como en el Excel.
alter table intervenciones
  add column if not exists subtipo text check (subtipo in ('inyeccion','produccion','conversion'));

-- 4. Roll-forward de depleción de reservas — Opening → Depletion (=
--    producción del año) → Closing, por yacimiento/categoría/año.
--    Se recalcula a partir de reservas_anuales (apertura, año base) y
--    resultados_escenario_anual (producción del motor).
create table if not exists reservas_depletion_anual (
    id              bigint generated always as identity primary key,
    escenario_id    bigint not null references escenarios(id),
    yacimiento_id   bigint not null references yacimientos(id),
    categoria       text not null check (categoria in ('P1','P2','P3')),
    anio            int not null,
    apertura_boe    numeric(16,2) not null default 0,
    depletion_boe   numeric(16,2) not null default 0,
    cierre_boe      numeric(16,2) not null default 0,
    unique (escenario_id, yacimiento_id, categoria, anio)
);
alter table reservas_depletion_anual enable row level security;
create policy "reservas_service_role_all" on reservas_depletion_anual for all using (auth.role() = 'service_role');
