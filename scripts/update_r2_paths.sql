-- ══════════════════════════════════════════════════════════════════════════
-- FUNNY STATION : MISE À JOUR DES CHEMINS DES ROMS VERS CLOUDFLARE R2
-- ──────────────────────────────────────────────────────────────────────────
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Met à jour tous les chemins locaux '/games' ou '/games/...' vers l'URL du Cloudflare Worker R2
UPDATE public.games 
SET assets_bucket_path = REPLACE(assets_bucket_path, '/games', 'https://funnystation.agavoubj.workers.dev/games')
WHERE assets_bucket_path LIKE '/games%';

-- 2. Met à jour spécifiquement Street Fighter si le chemin est encore sous format R2 incomplet
UPDATE public.games
SET assets_bucket_path = 'https://funnystation.agavoubj.workers.dev/games'
WHERE slug = 'street-fighter-alpha-2-gold';

-- 3. Vérification des résultats (affiche la liste des jeux et leurs nouveaux chemins)
SELECT title, slug, assets_bucket_path, entry_point 
FROM public.games
ORDER BY runtime, title;
