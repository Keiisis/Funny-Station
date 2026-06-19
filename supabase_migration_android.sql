-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION : Ajout du support Android (APK)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Ajouter 'android' à l'énumération game_runtime dans la base de données
ALTER TYPE game_runtime ADD VALUE 'android';
