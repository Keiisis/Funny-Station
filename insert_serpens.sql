-- ══════════════════════════════════════════════════════════════════════════
-- AJOUT DU JEU : Serpens — Ascension (Snake 3D, Three.js)
-- À exécuter dans : Supabase Dashboard > SQL Editor
--
-- Jeu HTML5/JS (Three.js), servi en local (/public/games/serpens). Runtime 'js',
-- point d'entrée index.html. Manette : joystick = déplacement, boutons = pouvoirs.
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path,
                          background_url, price, manifest, status)
VALUES (
  'Serpens — Ascension',
  'serpens',
  'Snake 3D de survie : biomes évolutifs, météo dynamique, mode Rage, boss et 6 super-pouvoirs. Joystick = déplacement, boutons d''action = pouvoirs.',
  'js',
  'index.html',
  '/games/serpens',
  'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=1470&auto=format&fit=crop',
  0,
  '{"screen_ratio":"16/9"}'::jsonb,
  'published'
)
ON CONFLICT (slug) DO NOTHING;

-- Trophées (les clés correspondent aux succès internes du jeu remontés via le pont).
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
  ('serpens', 'first_blood', 'Premier Sang',     'Tuer un ennemi.',                 'bronze',   10),
  ('serpens', 'glutton',     'Glouton',          'Atteindre 20 de longueur.',       'silver',   40),
  ('serpens', 'anaconda',    'Anaconda',         'Atteindre 40 de longueur.',       'gold',     90),
  ('serpens', 'wave10',      'Vétéran',          'Atteindre la vague 10.',          'gold',     100),
  ('serpens', 'score20k',    '20 000 points',    'Atteindre un score de 20 000.',   'platinum', 250),
  ('serpens', 'infinite',    'Vers l''Infini',   'Jouer en mode infini.',           'bronze',   15)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
