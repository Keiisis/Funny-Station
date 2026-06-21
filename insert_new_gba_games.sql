-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Enregistrer les 09 nouveaux jeux GBA et leurs Trophées
-- À exécuter dans : Supabase Dashboard > SQL Editor (bypasse les règles RLS)
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Insérer les jeux dans la table public.games
INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path, background_url, price, manifest, status)
VALUES 
  (
    'James Bond 007: Everything or Nothing', 
    '007-everything-or-nothing',
    'Incarnez le plus célèbre des agents secrets dans une aventure exclusive sur GBA. Gadgets, infiltration et action intense à la troisième personne.',
    'gba', 
    '007 - Everything or Nothing (USA, Europe) (En,Fr,De).gba', 
    '/games',
    'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Super Mario Advance 4: Super Mario Bros. 3', 
    'super-mario-advance-4',
    'Le classique légendaire NES réédité pour la GBA. Voyagez à travers des mondes fantastiques, revêtez des costumes magiques et sauvez la princesse Peach.',
    'gba', 
    '1190 - Super Mario Advance 4 - Super Mario Bros 3 (E)(Menace).gba', 
    '/games',
    'https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Dragon Ball Z: Buu''s Fury + GT: Transformation', 
    'dbz-buus-fury-gt-transformation',
    'Deux jeux cultes de combat et d''action RPG sur une seule cartouche. Revivez la saga de Buu et les aventures épiques de Dragon Ball GT.',
    'gba', 
    '2 Games in 1! - Dragon Ball Z - Buu''s Fury + Dragon Ball GT - Transformation (USA).gba', 
    '/games',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1374&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Dragon Ball: Advanced Adventure', 
    'dragon-ball-advanced-adventure',
    'Suivez les débuts de Son Goku dans un excellent jeu d''action et de plateforme en 2D. Revivez l''entraînement avec Tortue Géniale et le tournoi d''arts martiaux.',
    'gba', 
    'Dragon Ball - Advanced Adventure (USA).gba', 
    '/games',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1494&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'GTA Advance', 
    'gta-advance',
    'Retournez à Liberty City en vue de dessus classique. Remplissez des missions pour les syndicats du crime dans un monde ouvert riche en action.',
    'gba', 
    'Grand Theft Auto Advance (USA).gba', 
    '/games',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Naruto: Ninja Council 2', 
    'naruto-ninja-council-2',
    'Incarnez Naruto, Sasuke ou Sakura et utilisez vos techniques secrètes ninjas pour combattre vos ennemis et réussir vos missions.',
    'gba', 
    'Naruto - Ninja Council 2 (USA).gba', 
    '/games',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1374&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Need for Speed: Most Wanted', 
    'nfs-most-wanted',
    'Des courses-poursuites effrénées avec la police et des duels contre la Blacklist. Customisez votre voiture et devenez le pilote le plus recherché.',
    'gba', 
    'Need for Speed - Most Wanted (USA, Europe) (En,Fr,De,It).gba', 
    '/games',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'One Piece', 
    'one-piece',
    'Suivez Luffy dans son périple pour devenir le Roi des Pirates. Un excellent Beat''em up en 2D avec des combats spectaculaires.',
    'gba', 
    'One Piece (USA).gba', 
    '/games',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Street Fighter Alpha 3', 
    'street-fighter-alpha-3',
    'Le jeu de combat légendaire avec 31 personnages uniques. Choisissez votre style de combat (Isms) et dominez l''arène.',
    'gba', 
    'Street Fighter Alpha 3 (USA).gba', 
    '/games',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  )
ON CONFLICT (slug) DO NOTHING;

-- 2. Insérer les trophées des jeux
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
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
    ('street-fighter-alpha-3', 'world_warrior', 'Guerrier Ultime', 'Terminer le mode Arcade sans utiliser de continue.', 'gold', 150)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
