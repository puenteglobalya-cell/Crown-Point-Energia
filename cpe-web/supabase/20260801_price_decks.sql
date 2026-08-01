-- ============================================================
-- Price decks — curvas de precio nombradas y reutilizables
-- ============================================================
-- `precios_referencia` se carga fila por fila, un registro por referencia y por
-- mes: 240 registros a mano por referencia para un horizonte de 20 años, y
-- cambiar el supuesto de precio implica reescribirlos todos. Es exactamente la
-- crítica documentada a las herramientas legacy: los inputs quedan
-- hardcodeados y actualizar un deck obliga a rehacer el trabajo.
--
-- Un deck es una curva con nombre propio ("Base 2026", "Bull", "Bear",
-- "Constante 2026", "Pronóstico Sproule"): unos pocos puntos anuales más una
-- escalación para los años que siguen. Un escenario apunta a un deck, y
-- cambiar el deck recalcula todo lo que lo usa.
--
-- NI 51-101 pide informar el valor de las reservas con **precios de pronóstico**
-- y también con **precios constantes**. Con decks eso es correr el mismo
-- escenario contra dos decks, en lugar de mantener dos juegos de datos.
--
-- El deck alimenta el precio de REFERENCIA (Brent, por ejemplo). La conversión
-- a boca de pozo la sigue haciendo `formulas_precio` con su diferencial de
-- cuenca, retenciones y tarifa de almacenamiento.

create table if not exists price_decks (
    id                   bigint generated always as identity primary key,
    nombre               text not null unique,
    tipo                 text not null default 'pronostico'
                         check (tipo in ('pronostico','constante','strip','sensibilidad')),
    descripcion          text,
    -- Escalación aplicada a los años posteriores al último punto cargado.
    -- 0.02 = 2% anual. En un deck constante se deja en 0.
    escalacion_anual     numeric(6,4) not null default 0,
    notas                text
);

comment on table price_decks is
  'Curva de precios de referencia con nombre propio. Un escenario apunta a un deck; cambiar el deck recalcula todo lo que lo usa.';
comment on column price_decks.escalacion_anual is
  'Escalación para los años posteriores al último punto cargado. 0 = precio plano (deck constante).';

alter table price_decks enable row level security;
create policy "reservas_service_role_all" on price_decks for all using (auth.role() = 'service_role');

create table if not exists price_deck_puntos (
    id             bigint generated always as identity primary key,
    price_deck_id  bigint not null references price_decks(id) on delete cascade,
    -- Misma referencia que usa formulas_precio (ej. 'brent').
    referencia     text not null,
    anio           int  not null,
    precio_usd     numeric(12,4) not null,
    unique (price_deck_id, referencia, anio)
);

comment on table price_deck_puntos is
  'Puntos anuales del deck. Entre años cargados se interpola linealmente; después del último se aplica la escalación.';

alter table price_deck_puntos enable row level security;
create policy "reservas_service_role_all" on price_deck_puntos for all using (auth.role() = 'service_role');

-- Un escenario resuelve sus precios de referencia contra este deck. Si queda
-- en NULL, sigue usando precios_referencia como hasta ahora.
alter table escenarios
  add column if not exists price_deck_id bigint references price_decks(id) on delete set null;
