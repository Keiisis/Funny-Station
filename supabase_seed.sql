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
   0, '{}'::jsonb, 'published'),

  ('James Bond 007: Everything or Nothing', '007-everything-or-nothing',
   'Incarnez le plus célèbre des agents secrets dans une aventure exclusive sur GBA. Gadgets, infiltration et action intense à la troisième personne.',
   'gba', '007 - Everything or Nothing (USA, Europe) (En,Fr,De).gba', '/games',
   'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=1470&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('Super Mario Advance 4: Super Mario Bros. 3', 'super-mario-advance-4',
   'Le classique légendaire NES réédité pour la GBA. Voyagez à travers des mondes fantastiques, revêtez des costumes magiques et sauvez la princesse Peach.',
   'gba', '1190 - Super Mario Advance 4 - Super Mario Bros 3 (E)(Menace).gba', '/games',
   'https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?q=80&w=1470&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('Dragon Ball Z: Buu''s Fury + GT: Transformation', 'dbz-buus-fury-gt-transformation',
   'Deux jeux cultes de combat et d''action RPG sur une seule cartouche. Revivez la saga de Buu et les aventures épiques de Dragon Ball GT.',
   'gba', '2 Games in 1! - Dragon Ball Z - Buu''s Fury + Dragon Ball GT - Transformation (USA).gba', '/games',
   'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1374&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('Dragon Ball: Advanced Adventure', 'dragon-ball-advanced-adventure',
   'Suivez les débuts de Son Goku dans un excellent jeu d''action et de plateforme en 2D. Revivez l''entraînement avec Tortue Géniale et le tournoi d''arts martiaux.',
   'gba', 'Dragon Ball - Advanced Adventure (USA).gba', '/games',
   'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1494&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('GTA Advance', 'gta-advance',
   'Retournez à Liberty City en vue de dessus classique. Remplissez des missions pour les syndicats du crime dans un monde ouvert riche en action.',
   'gba', 'Grand Theft Auto Advance (USA).gba', '/games',
   'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1470&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('Naruto: Ninja Council 2', 'naruto-ninja-council-2',
   'Incarnez Naruto, Sasuke ou Sakura et utilisez vos techniques secrètes ninjas pour combattre vos ennemis et réussir vos missions.',
   'gba', 'Naruto - Ninja Council 2 (USA).gba', '/games',
   'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1374&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('Need for Speed: Most Wanted', 'nfs-most-wanted',
   'Des courses-poursuites effrénées avec la police et des duels contre la Blacklist. Customisez votre voiture et devenez le pilote le plus recherché.',
   'gba', 'Need for Speed - Most Wanted (USA, Europe) (En,Fr,De,It).gba', '/games',
   'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1470&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('One Piece', 'one-piece',
   'Suivez Luffy dans son périple pour devenir le Roi des Pirates. Un excellent Beat''em up en 2D avec des combats spectaculaires.',
   'gba', 'One Piece (USA).gba', '/games',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1470&auto=format&fit=crop',
   0, '{}'::jsonb, 'published'),

  ('Street Fighter Alpha 3', 'street-fighter-alpha-3',
   'Le jeu de combat légendaire avec 31 personnages uniques. Choisissez votre style de combat (Isms) et dominez l''arène.',
   'gba', 'Street Fighter Alpha 3 (USA).gba', '/games',
   'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
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
    ('top-down-horror','first_kill',     'Premier Sang',                'Éliminer votre premier démon.',                   'bronze',   15),
    ('top-down-horror','escape',         'Survivant de l''Ombre',        'S''échapper de la zone de quarantaine.',          'gold',     150),
    ('gba-test',       'first_gba',      'Nostalgie GBA',               'Lancer votre premier jeu Game Boy Advance.',       'bronze',   20),
    ('jackie-chan',    'first_level',    'Apprenti Combattant',          'Terminer le premier niveau du jeu.',              'bronze',   15),
    ('jackie-chan',    'all_talismans',  'Maître des Talismans',        'Récupérer tous les talismans magiques.',           'gold',     150),
    ('007-everything-or-nothing', 'first_mission', 'Apprenti Espion', 'Terminer la première mission d''infiltration.', 'bronze', 15),
    ('007-everything-or-nothing', 'platinum_bond', 'Double-Zéro', 'Obtenir la distinction Platine sur toutes les missions.', 'gold', 150),
    ('super-mario-advance-4', 'first_world', 'Sauveur du Royaume', 'Terminer le premier monde (Plaines).', 'bronze', 15),
    ('super-mario-advance-4', 'beat_bowser', 'Fin de la Dynastie Koopa', 'Vaincre Bowser et sauver la princesse Peach.', 'gold', 150),
    ('dbz-buus-fury-gt-transformation', 'super_saiyan', 'Au-delà du Super Saiyan', 'Atteindre la transformation de Super Saiyan 3.', 'bronze', 15),
    ('dbz-buus-fury-gt-transformation', 'save_universe', 'Protecteur de l''Univers', 'Vaincre Kid Buu et restaurer la paix dans l''univers.', 'gold', 150),
    ('dragon-ball-advanced-adventure', 'kamehameha', 'Premier Kamehameha', 'Maîtriser l''onde de choc de l''école de la Tortue.', 'bronze', 15),
    ('dragon-ball-advanced-adventure', 'tournament_winner', 'Champion du Monde', 'Remporter le championnat du monde des arts martiaux.', 'gold', 150),
    ('gta-advance', 'first_heist', 'Petite Frappe', 'Réussir votre premier vol de voiture pour la pègre.', 'bronze', 15),
    ('gta-advance', 'kingpin', 'Parrain de Liberty City', 'Prendre le contrôle total des affaires de Liberty City.', 'gold', 150),
    ('naruto-ninja-council-2', 'genin_exam', 'Examen Genin', 'Maîtriser les bases du combat de ninja.', 'bronze', 15),
    ('naruto-ninja-council-2', 'hokage_dream', 'La Voie du Hokage', 'Terminer le mode histoire avec le rang maximum.', 'gold', 150),
    ('nfs-most-wanted', 'blacklist_15', 'Entrée dans la Blacklist', 'Battre le 15ème membre de la Blacklist.', 'bronze', 15),
    ('nfs-most-wanted', 'most_wanted', 'Le Plus Recherché', 'Devenir le pilote numéro 1 de Rockport.', 'gold', 150),
    ('one-piece', 'grand_line', 'Départ pour Grand Line', 'Réunir les premiers membres de l''équipage du Chapeau de Paille.', 'bronze', 15),
    ('one-piece', 'pirate_king', 'Le Roi des Pirates', 'Trouver le trésor légendaire et vaincre tous les boss.', 'gold', 150),
    ('street-fighter-alpha-3', 'first_victory', 'Premier K.O.', 'Remporter votre premier combat dans le mode Arcade.', 'bronze', 15),
    ('street-fighter-alpha-3', 'world_warrior', 'Guerrier Ultime', 'Terminer le mode Arcade sans utiliser de continue.', 'gold', 150),
    ('street-fighter-alpha-2-gold', 'first_combo', 'Combo Master', 'Réaliser un combo de 5 coups ou plus en plein combat.', 'bronze', 15),
    ('street-fighter-alpha-2-gold', 'arcade_champion', 'Champion Suprême', 'Vaincre Shin Akuma et terminer le mode Arcade.', 'gold', 150)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
