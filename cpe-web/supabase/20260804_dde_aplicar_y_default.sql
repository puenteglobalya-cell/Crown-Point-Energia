-- El DDE% no lo tipea el usuario mes a mes — es la escala fija del Excel
-- real (0% si Brent <= 65, 8% si Brent >= 80, lineal entre medio). Se deja
-- como default de fila nueva (ver entityConfig.ts) y esta casilla para
-- desactivarlo puntualmente sin tener que borrar los 4 campos del tramo.
alter table formulas_precio
  add column if not exists aplicar_dde boolean not null default true;
