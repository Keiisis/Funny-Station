-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Enregistrer "Street Fighter Alpha 2 Gold" (PS1) et ses Trophées
-- À exécuter dans : Supabase Dashboard > SQL Editor (bypasse les règles RLS)
-- Note : Exécutez d'abord le fichier supabase_migration_psx.sql
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Insérer le jeu dans la table public.games
INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path, background_url, price, manifest, status)
VALUES (
  'Street Fighter Alpha 2 Gold', 
  'street-fighter-alpha-2-gold',
  'L''expérience ultime de combat 2D sur PlayStation 1. Retrouvez des personnages inédits, des modes de jeu approfondis et la jouabilité technique légendaire de la saga Alpha.',
  'psx', 
  'Street Fighter Collection [Disc2of2] (Street Fighter Alpha 2 Gold) [SLUS-00584].cue', 
  '/games/Street Fighter Collection [Disc2of2] (Street Fighter Alpha 2 Gold) [SLUS-00584] [bin]',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
  0, 
  '{}'::jsonb, 
  'published'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insérer les trophées du jeu
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
    ('street-fighter-alpha-2-gold', 'first_combo', 'Combo Master', 'Réaliser un combo de 5 coups ou plus en plein combat.', 'bronze', 15),
    ('street-fighter-alpha-2-gold', 'arcade_champion', 'Champion Suprême', 'Vaincre Shin Akuma et terminer le mode Arcade.', 'gold', 150)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
