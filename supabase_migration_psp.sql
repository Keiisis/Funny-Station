-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION : Ajout du support PlayStation Portable (PSP)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Ajouter 'psp' à l'énumération game_runtime dans la base de données
ALTER TYPE game_runtime ADD VALUE 'psp';
