-- ══════════════════════════════════════════════════════════════════════════
-- FUNNY STATION : SEED (jeux de démo + trophées)
-- À exécuter APRÈS supabase_schema.sql, dans Supabase > SQL Editor.
-- Idempotent : ré-exécutable sans doublons (ON CONFLICT sur slug).
--
-- Les jeux de démo servent leurs assets depuis /public/games (assets_bucket_path
-- commençant par '/games/...'). Les jeux uploadés par les créateurs iront, eux,
-- dans le bucket Storage 'game-assets' (chemin 'games/<id>').
-- ══════════════════════════════════════════════════════════════════════════

-- ── JEUX ────────────────────────────────────────────────────────────────────
INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path,
                          background_url, price, manifest, status)
VALUES
  ('Neon Runner', 'neon-runner',
   'Esquivez les obstacles néons dans cette course HTML5 Canvas. Jouable en local et en ligne.',
   'js', 'index.js', '/games/neon-runner',
   'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
   0, '{"screen_ratio":"16/9"}'::jsonb, 'published'),

  ('PyPyodide Math Canvas', 'pypyodide-math',
   'Calcul matriciel en Python via le runtime Pyodide, évalué en temps réel dans le navigateur.',
   'python', 'main.py', '/games/py-math',
   'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1470&auto=format&fit=crop',
   150, '{"python_libs":["numpy"]}'::jsonb, 'published'),

  ('Wasm Raytracer', 'wasm-raytracer',
   'Moteur de rendu compilé en WebAssembly pour des performances de calcul natives.',
   'wasm', 'game.wasm', '/games/wasm-raytracer',
   'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1364&auto=format&fit=crop',
   300, '{"maxMemoryMb":256}'::jsonb, 'published'),

  ('Lua Adventure', 'lua-adventure',
   'Aventure textuelle interactive développée en Lua, exécutée via l''interpréteur Fengari.',
   'lua', 'game.lua', '/games/lua-adventure',
   'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1374&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('Java Retro Game', 'java-retro',
   'Mini-jeu rétro compilé en JAR, exécuté via CheerpJ dans une JVM web.',
   'java', 'game.jar', '/games/java-retro',
   'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=1470&auto=format&fit=crop',
   500, '{}'::jsonb, 'published'),

  ('Top-Down Horror Survival', 'top-down-horror',
   'Survivez face aux démons dans ce jeu d''horreur en 3D en vue du dessus développé avec Unity.',
   'js', 'index.html', '/games/top-down-horror',
   'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1470&auto=format&fit=crop',
   0, '{"screen_ratio":"16/9"}'::jsonb, 'published'),

  ('GBA Test Game', 'gba-test',
   'Jouez à ce jeu Game Boy Advance émulé de manière transparente et invisible dans le navigateur.',
   'gba', 'game.gba', '/games/gba-test',
   'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1470&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('Jackie Chan Adventures', 'jackie-chan',
   'Incarnez Jackie Chan dans cette aventure Game Boy Advance, combattez la Main Sombre et récupérez les Talismans magiques !',
   'gba', 'game.gba', '/games/jackie-chan',
   'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1374&auto=format&fit=crop',
   0, '{}'::jsonb, 'published')
ON CONFLICT (slug) DO NOTHING;

-- ── TROPHÉES (rattachés aux jeux par slug ; trophy_key = clé stable côté jeu) ─
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
    ('neon-runner',    'first_steps',    'Premiers Pas',                'Lancer votre premier jeu sur Funny Station.',      'bronze',   10),
    ('neon-runner',    'legend',         'Légende de la Funny Station', 'Débloquer tous les secrets du système.',           'platinum', 250),
    ('pypyodide-math', 'python_dev',     'Développeur Python',          'Exécuter un script Python isolé dans le Kernel.',  'silver',   50),
    ('pypyodide-math', 'haptic_master',  'Maître Haptique',             'Activer les moteurs de vibration de la DualSense.','gold',     100),
    ('lua-adventure',  'lua_adventurer', 'Aventurier Lua',              'Exécuter un script Lua avec Fengari.',             'bronze',   15),
    ('java-retro',     'java_machine',   'Machine Java',                'Lancer l''émulation de la JVM CheerpJ.',           'gold',     120),
    ('top-down-horror','first_kill',     'Premier Sang',                'Éliminer votre premier démon.',                   'bronze',   15),
    ('top-down-horror','escape',         'Survivant de l''Ombre',        'S''échapper de la zone de quarantaine.',          'gold',     150),
    ('gba-test',       'first_gba',      'Nostalgie GBA',               'Lancer votre premier jeu Game Boy Advance.',       'bronze',   20),
    ('jackie-chan',    'first_level',    'Apprenti Combattant',          'Terminer le premier niveau du jeu.',              'bronze',   15),
    ('jackie-chan',    'all_talismans',  'Maître des Talismans',        'Récupérer tous les talismans magiques.',           'gold',     150)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
