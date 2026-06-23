-- ══════════════════════════════════════════════════════════════════════════
-- AJOUT DU JEU : Orb Arena (exemple multijoueur en ligne — SDK FunnyNet)
-- À exécuter dans : Supabase Dashboard > SQL Editor
--
-- Démonstration jouable du protocole multijoueur réutilisable (host-authoritative
-- + interpolation client). Sert aussi de template pour rendre tout jeu online.
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path,
                          background_url, price, manifest, status)
VALUES (
  'Orb Arena',
  'orb-arena',
  'Arène 2-4 joueurs EN LIGNE : déplace ton orbe, ramasse les sphères, prends la tête du score. Démo du netcode FunnyNet (synchro fluide host-authoritative).',
  'js',
  'index.js',
  '/games/orb-arena',
  'https://images.unsplash.com/photo-1614851099175-e5b30eb6f696?q=80&w=1470&auto=format&fit=crop',
  0,
  '{"screen_ratio":"16/9"}'::jsonb,
  'published'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
  ('orb-arena', 'first_orb',  'Première Sphère', 'Ramasser ta première orbe.',          'bronze', 10),
  ('orb-arena', 'online_duel','Duel en Ligne',   'Jouer une partie en ligne à 2+.',     'silver', 50)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
