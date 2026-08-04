-- cashflow_mensual.pozo_id es NOT NULL en la base real, aunque el esquema
-- del repo (20260730_reservas_base.sql) la define nullable — la tabla ya
-- existía de antes con esa restricción y "create table if not exists" nunca
-- la tocó. Facilities y las Intervenciones sin pozo real necesitan poder
-- guardar pozo_id null.
alter table cashflow_mensual alter column pozo_id drop not null;
