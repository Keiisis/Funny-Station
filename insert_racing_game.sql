-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Enregistrer "Racing Game Fall 2" et ses Trophées
-- À exécuter dans : Supabase Dashboard > SQL Editor (bypasse les règles RLS)
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Insérer le jeu dans la table public.games
INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path, background_url, price, manifest, status)
VALUES (
  'Racing Game Fall 2', 
  'racing-game',
  'Pilotez des bolides dans ce jeu de course palpitant en 3D développé avec Unity.',
  'js', 
  'index.html', 
  '/games/racing-game',
  '/images/racing-game.png',
  0, 
  '{"screen_ratio":"16/9"}'::jsonb, 
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  runtime = EXCLUDED.runtime,
  entry_point = EXCLUDED.entry_point,
  assets_bucket_path = EXCLUDED.assets_bucket_path,
  background_url = EXCLUDED.background_url,
  price = EXCLUDED.price,
  manifest = EXCLUDED.manifest,
  status = EXCLUDED.status;

-- 2. Insérer les trophées du jeu
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
    ('racing-game',    'first_win',      'Première Victoire',      'Remporter votre première course.',              'bronze',   20),
    ('racing-game',    'top_speed',      'Vitesse Maximale',      'Atteindre la vitesse maximale d''un bolide.',      'silver',   50),
    ('racing-game',    'drift_master',   'Dérapage Contrôlé',      'Réaliser un dérapage parfait.',                  'silver',   50),
    ('racing-game',    'cup_champion',   'Champion de la Coupe',  'Terminer toutes les pistes en première place.',  'gold',     150)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
ON CONFLICT (game_id, trophy_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  coin_reward = EXCLUDED.coin_reward;
