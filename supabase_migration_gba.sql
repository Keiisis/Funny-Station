-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION : Ajout du support Game Boy Advance (GBA)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Ajouter 'gba' à l'énumération game_runtime dans la base de données
ALTER TYPE game_runtime ADD VALUE 'gba';
