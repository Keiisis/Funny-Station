-- ══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC : pourquoi des jeux n'apparaissent pas dans la console ?
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Combien de jeux par runtime + statut ? (la console n'affiche que status='published')
SELECT runtime, status, COUNT(*) AS nb
FROM public.games
GROUP BY runtime, status
ORDER BY runtime, status;

-- 2) Liste complète (titre, slug, runtime, statut).
SELECT title, slug, runtime, status
FROM public.games
ORDER BY runtime, title;

-- 3) L'enum game_runtime contient-il bien 'nes' et 'snes' ?
--    (s'ils manquent, les INSERT de jeux NES/SNES ont ÉCHOUÉ → 0 jeu ajouté)
SELECT enumlabel AS runtimes_supportes
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'game_runtime'
ORDER BY enumlabel;

-- ── CORRECTIFS COURANTS ───────────────────────────────────────────────────
-- A) Si 'nes'/'snes' manquent à l'enum : exécute supabase_migration_nes_snes.sql
--    (SEUL, puis attends), PUIS ré-exécute insert_45_new_games.sql.
--
-- B) Si des jeux existent mais en status != 'published', publie-les :
-- UPDATE public.games SET status = 'published' WHERE status IS DISTINCT FROM 'published';
