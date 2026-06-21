-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION : Ajout du support PlayStation 1 (PSX)
-- À exécuter dans : Supabase Dashboard > SQL Editor (À exécuter en premier)
-- ══════════════════════════════════════════════════════════════════════════

ALTER TYPE game_runtime ADD VALUE 'psx';
