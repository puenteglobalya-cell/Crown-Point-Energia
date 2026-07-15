-- Fix grammar in /acerca hero heading (CMS override): "el futuro del energético
-- argentino" → "el futuro energético argentino" (remove stray "del")
UPDATE cms_fields SET value_es = 'Construimos el futuro<br/>energético argentino.', updated_at = NOW()
WHERE key = 'page.acerca.h1';
