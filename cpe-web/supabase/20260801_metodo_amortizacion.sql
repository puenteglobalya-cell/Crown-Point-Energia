-- ============================================================
-- Método de amortización del CAPEX
-- ============================================================
-- Definición del cliente: la amortización es por UNIDADES DE PRODUCCIÓN.
--
--   tasa del mes = producción del mes / reservas remanentes (P1+P2+P3)
--   cuota        = valor residual del CAPEX x tasa
--   y mes a mes bajan las dos cosas: la base de reservas por lo producido, y
--   el valor residual por la cuota amortizada.
--
-- Es el método estándar del sector y el correcto para petróleo y gas: un pozo
-- consume su inversión al ritmo al que produce. El motor amortizaba en línea
-- recta sobre `vida_util_meses`, que con una curva de declinación subamortiza
-- los primeros años y sobreamortiza la cola — y como la amortización es
-- deducible, eso corre el impuesto a las ganancias de período.
--
-- El centro de costo es el yacimiento: se juntan CAPEX y producción de todos
-- sus pozos contra su base de reservas, y la cuota del mes se reparte entre
-- los pozos según lo que produjo cada uno.
--
-- Se deja 'lineal' disponible para activos que no siguen la producción
-- (facilities, por ejemplo, si en algún momento se separan).

alter table escenarios
  add column if not exists metodo_amortizacion text not null default 'unidades_produccion'
    check (metodo_amortizacion in ('unidades_produccion','lineal'));

comment on column escenarios.metodo_amortizacion is
  'unidades_produccion (default) = producción / reservas remanentes sobre el valor residual. lineal = vida útil de cada intervención. Sin reservas cargadas para el yacimiento, el motor cae a lineal e informa un aviso.';
