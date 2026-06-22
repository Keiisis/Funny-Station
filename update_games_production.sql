-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Mettre à jour les chemins des gros jeux (PSX & PSP) en Production
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- 
-- Pourquoi : Vercel bloque le service de gros fichiers (>50 Mo) en statique ou 
-- via API (limite de 4.5 Mo sur les serverless functions, causant des erreurs 502/404).
-- Ce script fait pointer les jeux directement vers Cloudflare R2, qui gère 
-- parfaitement les gros fichiers et supporte CORS/COEP.
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Street Fighter Alpha 2 Gold (PSX)
UPDATE public.games
SET 
  entry_point = 'street-fighter-alpha-2-gold.pbp',
  assets_bucket_path = 'https://funnystation.agavoubj.workers.dev/games/street-fighter-alpha-2-gold'
WHERE slug = 'street-fighter-alpha-2-gold';

-- 2. Assassin's Creed: Bloodlines (PSP)
UPDATE public.games
SET 
  entry_point = 'Assassin''s Creed - Bloodlines (USA) (En,Fr,De,Es,It).cso',
  assets_bucket_path = 'https://funnystation.agavoubj.workers.dev/games/assassins-creed-bloodlines'
WHERE slug = 'assassins-creed-bloodlines';

-- 3. God of War: Ghost of Sparta (PSP)
UPDATE public.games
SET 
  entry_point = 'God of War - Ghost of Sparta (USA) (En,Fr,Es).cso',
  assets_bucket_path = 'https://funnystation.agavoubj.workers.dev/games/god-of-war-ghost-of-sparta'
WHERE slug = 'god-of-war-ghost-of-sparta';

-- 4. Grand Theft Auto: Vice City Stories (PSP)
UPDATE public.games
SET 
  entry_point = 'Grand Theft Auto - Vice City Stories (USA).cso',
  assets_bucket_path = 'https://funnystation.agavoubj.workers.dev/games/gta-vice-city-stories'
WHERE slug = 'gta-vice-city-stories';
