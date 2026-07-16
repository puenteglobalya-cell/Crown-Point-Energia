-- Ensure a "Gobierno corporativo" carpeta exists in the Biblioteca (VDR) so
-- the /esg links (anticorrupción, código de conducta, información
-- privilegiada, denuncia de irregularidades) resolve to a real folder
-- instead of a dead ?cat= query param the biblioteca page never read.
-- Visible to every existing group, since governance/compliance policies
-- apply company-wide, not to one department.
INSERT INTO bib_carpetas (nombre, descripcion, orden, activa)
SELECT 'Gobierno corporativo', 'Políticas de gobierno corporativo y cumplimiento', 0, true
WHERE NOT EXISTS (SELECT 1 FROM bib_carpetas WHERE nombre = 'Gobierno corporativo');

INSERT INTO bib_carpeta_grupos (carpeta_id, grupo_id)
SELECT c.id, g.id
FROM bib_carpetas c, bib_grupos g
WHERE c.nombre = 'Gobierno corporativo'
ON CONFLICT DO NOTHING;
