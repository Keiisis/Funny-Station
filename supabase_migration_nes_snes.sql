-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION : Ajout du support NES et SNES
-- À exécuter dans : Supabase Dashboard > SQL Editor (Étape 1)
-- ══════════════════════════════════════════════════════════════════════════

ALTER TYPE game_runtime ADD VALUE IF NOT EXISTS 'nes';
ALTER TYPE game_runtime ADD VALUE IF NOT EXISTS 'snes';
