-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Enregistrer "Top Down Horror Survival" et ses Trophées
-- À exécuter dans : Supabase Dashboard > SQL Editor (bypasse les règles RLS)
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Insérer le jeu dans la table public.games
-- Runtime = 'js' car le jeu Unity WebGL possède son propre index.html
-- qui sera chargé dans une iframe par le kernel (setupJsEnvironment).
INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path, background_url, price, manifest, status)
VALUES (
  'Top Down Horror Survival',
  'top-down-horror',
  'Survivez dans un monde post-apocalyptique infesté de créatures. Explorez, récoltez des ressources et combattez pour votre survie dans ce jeu d''horreur top-down intense !',
  'js',
  'index.html',
  '/games/top-down-horror',
  'https://images.unsplash.com/photo-1509248961085-879f4b970868?q=80&w=1374&auto=format&fit=crop',
  0,
  '{"maxMemoryMb": 512}'::jsonb,
  'published'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insérer les trophées du jeu
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
    ('top-down-horror', 'first_blood',     'Premier Sang',          'Éliminer votre premier ennemi.',                    'bronze',   15),
    ('top-down-horror', 'survivor_10min',  'Survivant Tenace',      'Survivre plus de 10 minutes sans mourir.',          'silver',   50),
    ('top-down-horror', 'all_weapons',     'Arsenal Complet',       'Débloquer toutes les armes disponibles.',           'gold',     150),
    ('top-down-horror', 'nightmare_clear', 'Cauchemar Vaincu',      'Terminer le mode Cauchemar.',                       'platinum', 300)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
