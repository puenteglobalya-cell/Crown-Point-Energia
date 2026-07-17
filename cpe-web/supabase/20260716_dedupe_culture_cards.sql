-- culture_cards had no real uniqueness constraint (its seed INSERT used
-- ON CONFLICT DO NOTHING against the auto-generated UUID id, which never
-- matches on a re-run), so running the seed more than once duplicated all
-- 4 cards on /carreras. Keep the earliest row per title_es and add a
-- constraint so this can't happen again.
DELETE FROM culture_cards a USING culture_cards b
WHERE a.title_es = b.title_es
  AND (a.updated_at, a.id) > (b.updated_at, b.id);

ALTER TABLE culture_cards
  ADD CONSTRAINT culture_cards_title_es_unique UNIQUE (title_es);
