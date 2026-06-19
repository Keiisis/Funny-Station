-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Enregistrer "Jackie Chan Adventures" et ses Trophées
-- À exécuter dans : Supabase Dashboard > SQL Editor (bypasse les règles RLS)
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Insérer le jeu dans la table public.games
INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path, background_url, price, manifest, status)
VALUES (
  'Jackie Chan Adventures', 
  'jackie-chan',
  'Incarnez Jackie Chan dans cette aventure Game Boy Advance, combattez la Main Sombre et récupérez les Talismans magiques !',
  'gba', 
  'game.gba', 
  '/games/jackie-chan',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1374&auto=format&fit=crop',
  0, 
  '{}'::jsonb, 
  'published'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insérer les trophées du jeu
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
    ('jackie-chan',    'first_level',    'Apprenti Combattant',          'Terminer le premier niveau du jeu.',              'bronze',   15),
    ('jackie-chan',    'all_talismans',  'Maître des Talismans',        'Récupérer tous les talismans magiques.',           'gold',     150)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
