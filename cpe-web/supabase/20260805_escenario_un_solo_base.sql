-- Nada impedía marcar es_base=true en más de un escenario del mismo
-- proyecto (o más de uno sin proyecto) — consolidado/route.ts elige el
-- primero por orden de id en silencio, sin avisar que hay un empate. Un
-- índice único parcial lo bloquea al guardar en vez de dejarlo pasar.
create unique index if not exists escenarios_un_base_por_proyecto_idx
  on escenarios (coalesce(proyecto_id, 0)) where es_base;
