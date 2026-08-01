-- ============================================================
-- Schema base del simulador de reservas
-- ============================================================
-- Este archivo faltaba: las tablas base del simulador se habían creado a mano
-- en Supabase y nunca se versionaron. Todas las migraciones posteriores
-- (20260731_*, 20260801_*, 20260802_*) son `alter table` o tablas satélite que
-- asumen que esto ya existe, así que ninguna corre sobre una base limpia.
--
-- Reconstruido a partir de lo que efectivamente leen y escriben
-- `lib/reservas/engine.ts`, las rutas de `/api/portal/reservas` y el formulario
-- de carga (`entityConfig.ts`). Correr ANTES que cualquier otra migración del
-- simulador.
--
-- Convenciones del modelo:
--
-- · Todos los inputs se cargan al 100% del proyecto (curvas, CAPEX, OPEX).
--   El motor los netea por la participación vigente en cada mes y guarda esa
--   participación en `cashflow_mensual.participacion_pct`, de modo que las
--   líneas quedan al 100% y el neto a CPE es reproducible desde ahí.
-- · `escenario_id` NULL significa "plan base, aplica a todos los escenarios".
-- · El acceso es sólo por service_role: la app entra con la clave de servicio
--   detrás de `requireReservasAccess()`, nunca desde el cliente.

-- ─── Geografía y activos ────────────────────────────────────────────────

create table if not exists provincias (
    id             bigint generated always as identity primary key,
    nombre         text not null unique,
    -- Ingresos brutos. 0.03 = 3%.
    alicuota_iibb  numeric(6,4) not null default 0.03
);

create table if not exists yacimientos (
    id                bigint generated always as identity primary key,
    nombre            text not null unique,
    provincia_id      bigint not null references provincias(id),
    tipo_recuperacion text check (tipo_recuperacion in ('primaria','secundaria'))
);

create table if not exists concesiones (
    id                bigint generated always as identity primary key,
    nombre            text not null unique,
    yacimiento_id     bigint not null references yacimientos(id),
    fecha_inicio      date not null,
    fecha_vencimiento date not null,
    check (fecha_vencimiento > fecha_inicio)
);

-- La participación cambia en el tiempo (farm-out, reversión). Es justamente
-- lo que hace que CUÁNDO se perfora cambie el resultado: el mismo pozo vale
-- distinto según el tramo en el que caiga.
create table if not exists concesion_participacion (
    id            bigint generated always as identity primary key,
    concesion_id  bigint not null references concesiones(id) on delete cascade,
    fecha_desde   date not null,
    fecha_hasta   date,
    porcentaje    numeric(6,4) not null check (porcentaje between 0 and 1),
    motivo        text,
    unique (concesion_id, fecha_desde),
    check (fecha_hasta is null or fecha_hasta > fecha_desde)
);

comment on column concesion_participacion.fecha_hasta is
  'NULL = tramo vigente. El siguiente tramo se carga como un registro nuevo con su propio fecha_desde.';

create table if not exists pozos (
    id            bigint generated always as identity primary key,
    nombre        text not null,
    concesion_id  bigint not null references concesiones(id),
    tipo          text check (tipo in ('productor_petroleo','productor_gas','inyector_agua')),
    fecha_alta    date not null,
    unique (concesion_id, nombre)
);

-- Curva de referencia. Un pozo tipo es el perfil que se le asigna a una
-- perforación nueva, que todavía no tiene historia propia.
create table if not exists pozos_tipo (
    id            bigint generated always as identity primary key,
    nombre        text not null unique,
    yacimiento_id bigint not null references yacimientos(id),
    categoria     text check (categoria in ('basico','drilling','workover','pulling'))
);

-- Una fila por mes de curva. `mes_offset` 0 es el primer mes: la curva es
-- relativa, y la fecha absoluta la fija la intervención que la activa.
create table if not exists curvas_produccion (
    id            bigint generated always as identity primary key,
    pozo_id       bigint references pozos(id) on delete cascade,
    pozo_tipo_id  bigint references pozos_tipo(id) on delete cascade,
    mes_offset    int not null check (mes_offset >= 0),
    bbl_petroleo  numeric(16,4) not null default 0,
    mcf_gas       numeric(16,4) not null default 0,
    -- O cuelga de un pozo real o de un pozo tipo, nunca de los dos.
    check (num_nonnulls(pozo_id, pozo_tipo_id) = 1)
);

create unique index if not exists curvas_produccion_pozo_idx
  on curvas_produccion (pozo_id, mes_offset) where pozo_id is not null;
create unique index if not exists curvas_produccion_tipo_idx
  on curvas_produccion (pozo_tipo_id, mes_offset) where pozo_tipo_id is not null;

-- ─── Costos e impuestos ─────────────────────────────────────────────────

create table if not exists regalias (
    id            bigint generated always as identity primary key,
    concesion_id  bigint not null references concesiones(id) on delete cascade,
    fecha_desde   date not null,
    porcentaje    numeric(6,4) not null check (porcentaje between 0 and 1),
    unique (concesion_id, fecha_desde)
);

-- Fijo por CONCESIÓN: se imputa una vez por mes, no una vez por pozo.
create table if not exists opex_fijo (
    id             bigint generated always as identity primary key,
    concesion_id   bigint not null references concesiones(id) on delete cascade,
    fecha_desde    date not null,
    monto_usd_mes  numeric(14,2) not null,
    concepto       text,
    unique (concesion_id, fecha_desde, concepto)
);

create table if not exists opex_variable (
    id             bigint generated always as identity primary key,
    yacimiento_id  bigint not null references yacimientos(id) on delete cascade,
    fecha_desde    date not null,
    usd_por_boe    numeric(12,4) not null,
    unique (yacimiento_id, fecha_desde)
);

-- Alícuota del impuesto a las ganancias. `nivel` deja abierto diferenciarla
-- por concesión; hoy el motor sólo lee las filas de nivel 'consolidado'.
create table if not exists parametros_impuesto_ganancias (
    id            bigint generated always as identity primary key,
    fecha_desde   date not null,
    alicuota      numeric(6,4) not null check (alicuota between 0 and 1),
    nivel         text not null default 'consolidado' check (nivel in ('consolidado','concesion')),
    concesion_id  bigint references concesiones(id) on delete cascade,
    -- Nivel concesión exige concesión; nivel consolidado no la admite.
    check ((nivel = 'concesion') = (concesion_id is not null))
);

create unique index if not exists parametros_ganancias_consolidado_idx
  on parametros_impuesto_ganancias (fecha_desde) where nivel = 'consolidado';

-- ─── Precios ────────────────────────────────────────────────────────────

create table if not exists formulas_precio (
    id                       bigint generated always as identity primary key,
    yacimiento_id            bigint not null references yacimientos(id) on delete cascade,
    producto                 text not null check (producto in ('petroleo','gas')),
    fecha_desde              date not null,
    referencia               text not null default 'brent',
    dde_pct                  numeric(8,4) not null default 0,
    divisor                  numeric(10,4) not null default 1 check (divisor <> 0),
    descuento_adicional_usd  numeric(12,4) not null default 0,
    unique (yacimiento_id, producto, fecha_desde)
);

comment on table formulas_precio is
  'precio = referencia x (1 - DDE%) / divisor - descuento adicional. Convierte el precio de referencia a boca de pozo.';

-- Cotización de la referencia, mes a mes.
create table if not exists precios_referencia (
    id          bigint generated always as identity primary key,
    referencia  text not null default 'brent',
    fecha       date not null,
    precio_usd  numeric(12,4) not null,
    unique (referencia, fecha)
);

-- Precio realizado por yacimiento y producto. Si existe para el mes, gana:
-- es un dato real y no hace falta derivarlo de la referencia por fórmula.
create table if not exists precios_mensuales (
    id             bigint generated always as identity primary key,
    yacimiento_id  bigint not null references yacimientos(id) on delete cascade,
    producto       text not null check (producto in ('petroleo','gas')),
    fecha          date not null,
    precio_usd     numeric(12,4) not null,
    unique (yacimiento_id, producto, fecha)
);

-- ─── Escenarios e intervenciones ────────────────────────────────────────

create table if not exists escenarios (
    id           bigint generated always as identity primary key,
    nombre       text not null unique,
    descripcion  text,
    es_base      boolean not null default false
);

-- Drilling, workover, pulling o facilities. Es lo que dispara el CAPEX y, si
-- trae pozo tipo, lo que activa una curva de producción nueva.
create table if not exists intervenciones (
    id                bigint generated always as identity primary key,
    pozo_id           bigint references pozos(id) on delete cascade,
    concesion_id      bigint not null references concesiones(id),
    tipo              text not null check (tipo in ('perforacion','workover','pulling','facilities')),
    fecha             date not null,
    capex_usd         numeric(16,2) not null default 0,
    vida_util_meses   int check (vida_util_meses is null or vida_util_meses > 0),
    pozo_tipo_id      bigint references pozos_tipo(id) on delete set null,
    -- NULL = plan base, aplica a todos los escenarios.
    escenario_id      bigint references escenarios(id) on delete cascade
);

comment on column intervenciones.fecha is
  'Fecha de primera producción: desde acá arranca la curva del pozo tipo.';
comment on column intervenciones.escenario_id is
  'NULL = plan base, entra en todos los escenarios. Con valor, sólo en ese escenario.';

create index if not exists intervenciones_escenario_idx on intervenciones (escenario_id);

-- ─── Reservas ───────────────────────────────────────────────────────────

-- P1/P2/P3 son categorías INCREMENTALES (probadas / probables / posibles),
-- no los acumulados 1P/2P/3P. El 2P es P1 + P2.
create table if not exists reservas_anuales (
    id             bigint generated always as identity primary key,
    yacimiento_id  bigint not null references yacimientos(id) on delete cascade,
    -- NULL = reporte base/auditado, aplica a todos los escenarios.
    escenario_id   bigint references escenarios(id) on delete cascade,
    anio           int not null,
    categoria      text not null check (categoria in ('P1','P2','P3')),
    reservas_bbl   numeric(16,2),
    reservas_boe   numeric(16,2) not null default 0,
    fecha_corte    date not null,
    unique (yacimiento_id, escenario_id, anio, categoria)
);

comment on column reservas_anuales.reservas_bbl is
  'Informativo. El motor usa reservas_boe.';

-- ─── Valuación de empresa en marcha ─────────────────────────────────────
-- No entran al cash flow de reservas: son el otro lado de la valuación.

create table if not exists supuestos_generales (
    id                     bigint generated always as identity primary key,
    escenario_id           bigint not null references escenarios(id) on delete cascade,
    yacimiento_id          bigint not null references yacimientos(id) on delete cascade,
    tipo_curva_precio      text default 'brent_futuros',
    premium_descuento_usd  numeric(12,4) default 0,
    working_interest_pct   numeric(6,4) default 1 check (working_interest_pct between 0 and 1),
    unique (escenario_id, yacimiento_id)
);

comment on column supuestos_generales.working_interest_pct is
  'NO es el que usa el motor. La participación que afecta el cálculo es concesion_participacion, que además admite tramos con fechas.';

create table if not exists deuda_notas (
    id                 bigint generated always as identity primary key,
    serie              text not null,
    moneda             text not null default 'USD',
    saldo_usd_mm       numeric(14,4) not null,
    fecha_corte        date not null,
    tasa_interes_pct   numeric(8,4),
    garantia           text check (garantia in ('secured','unsecured')),
    fecha_vencimiento  date,
    unique (serie, fecha_corte)
);

create table if not exists comparables_mercado (
    id                  bigint generated always as identity primary key,
    empresa             text not null,
    pais                text,
    fecha_corte         date not null,
    market_cap_usd_mm   numeric(14,2),
    deuda_neta_usd_mm   numeric(14,2),
    ev_usd_mm           numeric(14,2),
    dividend_yield_pct  numeric(8,4),
    reservas_p1_mmboe   numeric(14,2),
    reservas_p2_mmboe   numeric(14,2),
    npv10_p1_usd_mm     numeric(14,2),
    npv10_p2_usd_mm     numeric(14,2),
    produccion_kboepd   numeric(14,2),
    unique (empresa, fecha_corte)
);

-- ─── Salidas del motor ──────────────────────────────────────────────────
-- Se reescriben enteras en cada corrida (delete + insert por escenario), así
-- que no llevan restricciones de unicidad que compliquen el reemplazo.

-- Una fila por pozo y por mes. Las líneas están al 100% del proyecto; el neto
-- a CPE es cash_flow_neto_usd, que ya viene multiplicado por participacion_pct.
create table if not exists cashflow_mensual (
    id                             bigint generated always as identity primary key,
    escenario_id                   bigint not null references escenarios(id) on delete cascade,
    pozo_id                        bigint references pozos(id) on delete cascade,
    fecha                          date not null,
    bbl_petroleo                   numeric(16,4) not null default 0,
    mcf_gas                        numeric(16,4) not null default 0,
    precio_petroleo                numeric(12,4) not null default 0,
    precio_gas                     numeric(12,4) not null default 0,
    ingreso_bruto_usd              numeric(16,2) not null default 0,
    regalias_usd                   numeric(16,2) not null default 0,
    iibb_usd                       numeric(16,2) not null default 0,
    opex_fijo_usd                  numeric(16,2) not null default 0,
    opex_variable_usd              numeric(16,2) not null default 0,
    capex_usd                      numeric(16,2) not null default 0,
    depreciacion_usd               numeric(16,2) not null default 0,
    resultado_antes_ganancias_usd  numeric(16,2) not null default 0,
    impuesto_ganancias_usd         numeric(16,2) not null default 0,
    resultado_neto_usd             numeric(16,2) not null default 0,
    participacion_pct              numeric(6,4) not null default 1,
    cash_flow_neto_usd             numeric(16,2) not null default 0,
    economicamente_activo          boolean not null default true
);

comment on column cashflow_mensual.participacion_pct is
  'Participación vigente ese mes. Las demás columnas están al 100%; cash_flow_neto_usd ya viene neteado.';
comment on column cashflow_mensual.resultado_antes_ganancias_usd is
  'Base imponible = ventas - opex - regalías - IIBB - Imp. Débitos y Créditos - amortización.';

create index if not exists cashflow_mensual_escenario_idx on cashflow_mensual (escenario_id, fecha);

-- Resumen anual. yacimiento_id NULL = consolidado del escenario.
create table if not exists resultados_escenario_anual (
    id                       bigint generated always as identity primary key,
    escenario_id             bigint not null references escenarios(id) on delete cascade,
    yacimiento_id            bigint references yacimientos(id) on delete cascade,
    anio                     int not null,
    produccion_petroleo_bbl  numeric(18,2) not null default 0,
    produccion_gas_mcf       numeric(18,2) not null default 0,
    ingresos_usd             numeric(18,2) not null default 0,
    regalias_usd             numeric(18,2) not null default 0,
    opex_usd                 numeric(18,2) not null default 0,
    ebitda_usd               numeric(18,2) not null default 0,
    depreciacion_usd         numeric(18,2) not null default 0,
    ebit_usd                 numeric(18,2) not null default 0,
    intereses_usd            numeric(18,2) not null default 0,
    impuesto_ganancias_usd   numeric(18,2) not null default 0,
    resultado_neto_usd       numeric(18,2) not null default 0,
    netback_usd_boe          numeric(12,4)
);

comment on column resultados_escenario_anual.yacimiento_id is
  'NULL = fila consolidada del escenario (suma de todos los pozos). Base: neto a CPE.';

create index if not exists resultados_anual_idx on resultados_escenario_anual (escenario_id, anio);

-- VAN / TIR / payback de una corrida, por tasa y horizonte.
create table if not exists escenario_metricas (
    id               bigint generated always as identity primary key,
    escenario_id     bigint not null references escenarios(id) on delete cascade,
    tasa_descuento   numeric(6,4) not null,
    horizonte_anios  int not null,
    npv_usd          numeric(18,2),
    irr_pct          numeric(12,4),
    payback_anios    numeric(10,4),
    unique (escenario_id, tasa_descuento, horizonte_anios)
);

-- ─── RLS ────────────────────────────────────────────────────────────────
-- Todo el acceso pasa por el service_role desde el servidor. Se habilita RLS
-- sin política pública, de modo que la clave anónima no lee nada aunque
-- alguien exponga la tabla por error.
do $$
declare t text;
begin
  foreach t in array array[
    'provincias','yacimientos','concesiones','concesion_participacion','pozos',
    'pozos_tipo','curvas_produccion','regalias','opex_fijo','opex_variable',
    'parametros_impuesto_ganancias','formulas_precio','precios_referencia',
    'precios_mensuales','escenarios','intervenciones','reservas_anuales',
    'supuestos_generales','deuda_notas','comparables_mercado','cashflow_mensual',
    'resultados_escenario_anual','escenario_metricas'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    -- Idempotente: correr el script dos veces no tiene que fallar acá.
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'reservas_service_role_all'
    ) then
      execute format(
        'create policy "reservas_service_role_all" on %I for all using (auth.role() = ''service_role'')', t);
    end if;
  end loop;
end $$;
