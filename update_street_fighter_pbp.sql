-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Mettre à jour "Street Fighter Alpha 2 Gold" pour utiliser le format PBP
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- Le fichier PBP (396 Mo) remplace le .bin brut (598 Mo) qui crashait le navigateur.
-- Le PBP est un EBOOT compressé que EmulatorJS charge nativement sans problème de mémoire.

UPDATE public.games
SET 
  entry_point = 'street-fighter-alpha-2-gold.pbp',
  assets_bucket_path = '/games'
WHERE slug = 'street-fighter-alpha-2-gold';
