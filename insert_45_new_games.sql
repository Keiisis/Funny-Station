-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Enregistrer les 45 nouveaux jeux (GBA, NES, SNES) et leurs Trophées
-- À exécuter dans : Supabase Dashboard > SQL Editor (bypasse les règles RLS)
-- ══════════════════════════════════════════════════════════════════════════

-- ÉTAPE PRÉALABLE : Vous devez exécuter le script supabase_migration_nes_snes.sql 
-- en premier pour ajouter les valeurs 'nes' et 'snes' à l'énumération game_runtime.
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Insérer les jeux dans la table public.games
INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path, background_url, price, manifest, status)
VALUES 
  (
    'Sonic Advance', 
    'sonic-advance',
    'Le premier opus légendaire de la mascotte de Sega sur Game Boy Advance. Retrouvez Sonic, Tails, Knuckles et Amy face au terrible Dr. Eggman.',
    'gba', 
    '0339 - Sonic Advance (E)(Lightforce).gba', 
    '/games',
    '/images/Sonic Advance.png',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Mortal Kombat Advance', 
    'mortal-kombat-advance',
    'Combattez les plus grands guerriers de la Terre et de l''Outremonde dans ce portage dynamique et exigeant de Mortal Kombat sur GBA.',
    'gba', 
    '0951 - Mortal Kombat Advance (E)(GBANow).gba', 
    '/games',
    '/images/Mortal Kombat Advance.png',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    '1200-in-1 NES Multicart', 
    '1200-in-1-nes',
    'Une compilation rétro ultime regroupant des centaines de jeux classiques NES pour des heures de nostalgie et de plaisir infini.',
    'nes', 
    '1200-in-1 (J) [p1].nes', 
    '/games',
    '/images/1200-in-1 NES Multicart.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Dragon Ball Z: The Legacy of Goku I & II', 
    'dbz-legacy-of-goku-1-2',
    'Vivez la saga de Dragon Ball Z depuis l''arrivée des Saiyans jusqu''aux Cell Games dans cette double compilation de RPGs cultes.',
    'gba', 
    '2 Games in 1 - Dragon Ball Z - The Legacy of Goku I & II (USA).gba', 
    '/games',
    '/images/Dragon Ball Z The Legacy of Goku I & II.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Avatar: The Last Airbender', 
    'avatar-the-last-airbender',
    'Incarnez Aang et ses compagnons dans cette quête pour maîtriser les quatre éléments et sauver le monde de l''oppression de la Nation du Feu.',
    'gba', 
    'Avatar - the Last Airbender # GBA.GBA', 
    '/games',
    '/images/Avatar The Last Airbender.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Batman Begins', 
    'batman-begins',
    'Devenez le Chevalier Noir de Gotham. Utilisez la furtivité, les gadgets et la peur pour terroriser et neutraliser les criminels dans les ombres de la ville.',
    'gba', 
    'Batman Begins (USA, Europe) (En,Fr,De,Es,It,Nl).gba', 
    '/games',
    '/images/Batman Begins.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Contra Advance: The Alien Wars EX', 
    'contra-advance',
    'L''action frénétique de Contra débarque sur GBA avec de nouvelles cartes et des combats de boss épiques contre des hordes extraterrestres.',
    'gba', 
    'Contra Advance - The Alien Wars EX (USA).gba', 
    '/games',
    '/images/Contra Advance The Alien Wars EX.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Contra III: The Alien Wars', 
    'contra-3',
    'Combattez les envahisseurs extraterrestres dans les rues en ruine du futur. Le summum de l''action run ''n'' gun de la SNES, jouable à deux !',
    'snes', 
    'Contra III - The Alien Wars (USA).sfc', 
    '/games',
    '/images/Contra III The Alien Wars.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Doom', 
    'doom-gba',
    'Le légendaire jeu de tir à la première personne disponible dans le creux de votre main. Éradiquez les démons venus de l''enfer sur Mars.',
    'gba', 
    'Doom (USA, Europe).gba', 
    '/games',
    '/images/Doom.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Doom II', 
    'doom-2-gba',
    'L''enfer s''est emparé de la Terre. Prenez votre super-shotgun et combattez des menaces encore plus terrifiantes dans cette suite d''anthologie.',
    'gba', 
    'Doom II (USA).gba', 
    '/games',
    '/images/Doom II.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Double Dragon', 
    'double-dragon-nes',
    'Le classique absolu du Beat''em up. Aidez Billy et Jimmy Lee à secourir Marian des griffes du gang des Black Warriors.',
    'nes', 
    'Double Dragon (USA).nes', 
    '/games',
    '/images/Double Dragon.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Double Dragon Advance', 
    'double-dragon-advance',
    'Considéré comme l''un des meilleurs épisodes de la série. Un Beat''em up dynamique et fluide reprenant le meilleur de la franchise sur GBA.',
    'gba', 
    'Double Dragon Advance (USA).gba', 
    '/games',
    '/images/Double Dragon Advance.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Dragon Ball Z: Super Butoden 2', 
    'dbz-super-butoden-2',
    'Un des jeux de combat les plus marquants de la Super Nintendo. Vivez des duels à écran divisé intenses et lancez des vagues d''énergie dévastatrices.',
    'snes', 
    'Dragon Ball Z - Super Butoden 2 (V1.1) (J).fig', 
    '/games',
    '/images/Dragon Ball Z Super Butoden 2.svg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Dragon Ball Z: Supersonic Warriors', 
    'dbz-supersonic-warriors',
    'Des combats aériens rapides et stratégiques basés sur l''univers de DBZ. Participez à des tournois ou suivez des histoires alternatives passionnantes.',
    'gba', 
    'Dragon Ball Z - Supersonic Warriors (USA).gba', 
    '/games',
    '/images/Dragon Ball Z Supersonic Warriors.png',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'FIFA 07', 
    'fifa-07-gba',
    'Dirigez vos équipes préférées et menez-les vers la gloire dans cette édition portable de la célèbre simulation de football.',
    'gba', 
    'FIFA 2007 # GBA.GBA', 
    '/games',
    '/images/FIFA 07.png',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Fire Emblem: The Binding Blade', 
    'fire-emblem-binding-blade',
    'Le tout premier épisode de la saga culte sur GBA (traduit en anglais). Suivez les aventures de Roy pour protéger la terre d''Elibe.',
    'gba', 
    'Fire Emblem - The Binding Blade (T).gba', 
    '/games',
    '/images/Fire Emblem The Binding Blade.png',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Ghost Rider', 
    'ghost-rider',
    'Incarnez Johnny Blaze, le motard fantôme. Utilisez vos chaînes enflammées pour châtier les démons et accomplir la vengeance de Mephisto.',
    'gba', 
    'Ghost Rider (USA, Europe) (En,Fr,De,Es,It,Nl).gba', 
    '/games',
    '/images/Ghost Rider.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'The King of Fighters EX: NeoBlood', 
    'kof-ex-neoblood',
    'Le grand classique du combat SNK sur GBA. Constituez votre équipe de trois combattants et triomphez du tournoi international.',
    'gba', 
    'King of Fighters EX, The - NeoBlood (USA) (Rev 1).gba', 
    '/games',
    '/images/The King of Fighters EX NeoBlood.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Kingdom Hearts: Chain of Memories', 
    'kingdom-hearts-chain-of-memories',
    'Voyagez dans le Manoir de l''Oubli et explorez vos souvenirs à l''aide d''un système de combat révolutionnaire basé sur des cartes magiques.',
    'gba', 
    'Kingdom Hearts - Chain of Memories (USA).gba', 
    '/games',
    '/images/Kingdom Hearts Chain of Memories.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Lara Croft Tomb Raider: Legend', 
    'tomb-raider-legend-gba',
    'Suivez Lara Croft dans sa quête pour retrouver une relique ancienne mystique. Exploration, puzzles et plateforme en 3D isométrique.',
    'gba', 
    'Lara Croft Tomb Raider - Legend (USA) (En,Fr,De,Es,It).gba', 
    '/games',
    '/images/Lara Croft Tomb Raider Legend.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Mario vs. Donkey Kong', 
    'mario-vs-donkey-kong',
    'Donkey Kong a volé tous les Mini-Mario mécaniques ! Résolvez des énigmes et traversez des obstacles pour les récupérer et punir le grand singe.',
    'gba', 
    'Mario vs. Donkey Kong (USA, Australia).gba', 
    '/games',
    '/images/Mario vs. Donkey Kong.jfif',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Marvel: Ultimate Alliance', 
    'marvel-ultimate-alliance',
    'Formez votre alliance ultime de super-héros Marvel et combattez le redoutable Docteur Fatalis et ses Maîtres du Mal.',
    'gba', 
    'Marvel - Ultimate Alliance (USA).gba', 
    '/games',
    '/images/Marvel Ultimate Alliance.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Marvel Super Heroes in War of the Gems', 
    'marvel-war-of-gems',
    'Incarnez Spider-Man, Captain America, Iron Man, Wolverine et Hulk dans cette aventure épique de la SNES pour rassembler les Gemmes de l''Infini.',
    'snes', 
    'Marvel Super Heroes in War of the Gems (USA).sfc', 
    '/games',
    '/images/Marvel Super Heroes in War of the Gems.png',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Mega Man Zero', 
    'mega-man-zero',
    'Prenez le contrôle de Zero dans un jeu d''action-plateforme ultra exigeant. Combattez pour la survie des répliques face à Neo Arcadia.',
    'gba', 
    'Mega Man Zero (USA, Europe).gba', 
    '/games',
    '/images/Mega Man Zero.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Mortal Kombat', 
    'mortal-kombat-snes',
    'Le jeu de combat légendaire de la SNES. Affrontez les guerriers les plus brutaux de l''histoire et exécutez vos coups fatals.',
    'snes', 
    'Mortal Kombat (USA) (Rev 1).sfc', 
    '/games',
    '/images/Mortal Kombat.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Mortal Kombat: Deadly Alliance', 
    'mortal-kombat-deadly-alliance',
    'La célèbre saga de combat en 3D adaptée sur GBA. Deux styles de combat par personnage pour terrasser l''alliance de Shang Tsung et Quan Chi.',
    'gba', 
    'Mortal Kombat - Deadly Alliance (USA) (En,Fr,De,Es,It).gba', 
    '/games',
    '/images/Mortal Kombat Deadly Alliance.jpeg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Mortal Kombat: Tournament Edition', 
    'mortal-kombat-tournament-edition',
    'Une extension exclusive GBA de Deadly Alliance, comprenant de nouveaux personnages, arènes et modes de jeu inédits.',
    'gba', 
    'Mortal Kombat - Tournament Edition (U) (M5) [hI].gba', 
    '/games',
    '/images/Mortal Kombat Tournament Edition.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Mortal Kombat II', 
    'mortal-kombat-2',
    'La suite culte du jeu de combat sur Super Nintendo. Des graphismes améliorés, de nouveaux personnages et les fameuses Fatalities décuplées.',
    'snes', 
    'Mortal Kombat II (USA) (Rev 1).sfc', 
    '/games',
    '/images/Mortal Kombat II.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Need for Speed: Underground 2', 
    'nfs-underground-2',
    'Plongez dans le monde du tuning et des courses de rue nocturnes sur GBA. Customisez vos bolides et dominez le bitume.',
    'gba', 
    'Need for Speed - Underground 2 (USA, Europe) (En,Fr,De,It).gba', 
    '/games',
    '/images/Need for Speed Underground 2.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Ninja Gaiden Trilogy', 
    'ninja-gaiden-trilogy',
    'Une compilation d''exception sur Super Nintendo regroupant les trois premiers épisodes cultes et difficiles de la NES.',
    'snes', 
    'Ninja Gaiden Trilogy (USA).sfc', 
    '/games',
    '/images/Ninja Gaiden Trilogy.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Prince of Persia: The Sands of Time', 
    'prince-of-persia-sands-of-time',
    'Contrôlez les sables du temps pour éviter la mort et résoudre les énigmes dans ce chef-d''œuvre de plateforme-action en 2D sur GBA.',
    'gba', 
    'Prince of Persia - The Sands of Time (USA) (En,Fr,Es).gba', 
    '/games',
    '/images/Prince of Persia The Sands of Time.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Shaman King: Master of Spirits', 
    'shaman-king-master-of-spirits',
    'Incarnez Yoh Asakura dans ce magnifique jeu de plateforme/action de style Metroidvania. Fusionnez avec de nombreux esprits pour acquérir leurs pouvoirs.',
    'gba', 
    'Shaman King - Master of Spirits (USA).gba', 
    '/games',
    '/images/Shaman King Master of Spirits.png',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Sonic Battle', 
    'sonic-battle',
    'Un jeu de combat unique en 3D isométrique. Entraînez le robot Emerl et faites-le apprendre les techniques de vos héros préférés.',
    'gba', 
    'Sonic Battle (USA) (En,Ja,Fr,De,Es,It).gba', 
    '/games',
    '/images/Sonic Battle.jpeg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Spider-Man: The Animated Series', 
    'spiderman-animated-snes',
    'Incarnez le Tisseur dans ce jeu tiré du dessin animé culte des années 90. Combattez le Bouffon Vert, Venom et d''autres super-vilains.',
    'snes', 
    'Spider-Man - Animated (E).smc', 
    '/games',
    '/images/Spider-Man The Animated Series.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Spider-Man 3', 
    'spiderman-3-gba',
    'Affrontez le costume noir symbiotique et protégez New York des griffes de l''Homme-Sable et de Venom dans ce jeu d''action trépidant.',
    'gba', 
    'Spider-Man 3 (USA).gba', 
    '/games',
    '/images/Spider-Man 3.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Street Fighter V (Hack)', 
    'street-fighter-5-hack',
    'Un hack amateur curieux et fun adaptant les combattants modernes de Street Fighter V sur le moteur classique de la SNES.',
    'snes', 
    'Street Fighter 5 (Hack).smc', 
    '/games',
    '/images/Street Fighter V (Hack).jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Street Fighter Alpha 2', 
    'street-fighter-alpha-2-snes',
    'La référence absolue du jeu de combat 2D sur Super Nintendo, exploitant la puce S-DD1 pour un rendu arcade saisissant.',
    'snes', 
    'Street Fighter Alpha 2 (USA).sfc', 
    '/games',
    '/images/Street Fighter Alpha 2.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Street Fighter II Turbo', 
    'street-fighter-2-turbo',
    'L''une des versions les plus parfaites et rapides du légendaire jeu de combat de Capcom sur Super Nintendo.',
    'snes', 
    'Street Fighter II Turbo (V1.0) (E) [!].smc', 
    '/games',
    '/images/Street Fighter II Turbo.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Super Mario Advance 3: Yoshi''s Island', 
    'yoshis-island-gba',
    'Portez Bébé Mario sur le dos de Yoshi et explorez un monde merveilleux dessiné à la main. Le chef-d''œuvre de la plateforme sur GBA.',
    'gba', 
    'Super Mario Advance 3 - Yoshi''s Island (USA).gba', 
    '/games',
    '/images/Super Mario Advance 3 Yoshi''s Island.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Super Street Fighter II Turbo: Revival', 
    'super-street-fighter-2-turbo-revival',
    'Le combat ultime réinventé sur GBA avec de magnifiques arènes, un gameplay rééquilibré et des combats frénétiques.',
    'gba', 
    'Super Street Fighter II Turbo - Revival (USA).gba', 
    '/games',
    '/images/Super Street Fighter II Turbo Revival.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Teenage Mutant Ninja Turtles', 
    'tmnt-gba',
    'Incarnez les Tortues Ninja dans ce Beat''em up énergétique inspiré de la série animée des années 2000. Tranchez et combattez le clan des Foot.',
    'gba', 
    'Teenage Mutant Ninja Turtles (USA).gba', 
    '/games',
    '/images/Teenage Mutant Ninja Turtles.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Tekken Advance', 
    'tekken-advance',
    'Le célèbre jeu de combat 3D de Namco adapté avec brio à la 2D sur GBA, conservant les combos et les personnages cultes du jeu original.',
    'gba', 
    'Tekken Advance (USA).gba', 
    '/games',
    '/images/Tekken Advance.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Toy Story', 
    'toy-story-snes',
    'Incarnez Woody et parcourez les scènes cultes du chef-d''œuvre de Disney Pixar dans ce magnifique jeu de plateforme 2D.',
    'snes', 
    'Toy Story (USA).sfc', 
    '/games',
    '/images/Toy Story.webp',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Ultimate Mortal Kombat 3', 
    'ultimate-mortal-kombat-3',
    'L''édition la plus complète de MK3 sur Super Nintendo, avec de nouveaux personnages jouables comme Kitana, Jade, Reptile et Scorpion.',
    'snes', 
    'Ultimate Mortal Kombat 3 (USA).sfc', 
    '/games',
    '/images/Ultimate Mortal Kombat 3.jpg',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Ultimate Spider-Man', 
    'ultimate-spiderman-gba',
    'Balancez-vous à travers New York et incarnez au choix Spider-Man ou Venom dans cette aventure palpitante en cel-shading.',
    'gba', 
    'Ultimate Spider-Man (USA).gba', 
    '/games',
    '/images/Ultimate Spider-Man.png',
    0, 
    '{}'::jsonb, 
    'published'
  )
ON CONFLICT (slug) DO NOTHING;

-- 2. Insérer les deux trophées (Bronze pour le lancement, Or pour la complétion) pour chaque nouveau jeu
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
    ('sonic-advance', 'launch', 'Première Course', 'Lancer Sonic Advance pour la première fois.', 'bronze', 15),
    ('sonic-advance', 'complete', 'Sauveur de l''Île', 'Vaincre le Dr. Eggman et collecter toutes les Émeraudes du Chaos.', 'gold', 150),

    ('mortal-kombat-advance', 'launch', 'Guerrier Recrue', 'Lancer Mortal Kombat Advance pour la première fois.', 'bronze', 15),
    ('mortal-kombat-advance', 'complete', 'Champion d''Outremonde', 'Vaincre Shao Kahn dans le tournoi final.', 'gold', 150),

    ('1200-in-1-nes', 'launch', 'Collectionneur Rétro', 'Lancer la cartouche 1200-in-1 pour la première fois.', 'bronze', 15),
    ('1200-in-1-nes', 'complete', 'Légende des 8-bits', 'Parcourir les menus et lancer 10 classiques NES différents.', 'gold', 150),

    ('dbz-legacy-of-goku-1-2', 'launch', 'Esprit de Guerrier', 'Lancer The Legacy of Goku I & II pour la première fois.', 'bronze', 15),
    ('dbz-legacy-of-goku-1-2', 'complete', 'Super Saiyan Légendaire', 'Vaincre Cell dans sa forme parfaite et restaurer la paix.', 'gold', 150),

    ('avatar-the-last-airbender', 'launch', 'Éveil de l''Avatar', 'Lancer Avatar: The Last Airbender pour la première fois.', 'bronze', 15),
    ('avatar-the-last-airbender', 'complete', 'Maître des Éléments', 'Rétablir l''équilibre du monde en triomphant de la Nation du Feu.', 'gold', 150),

    ('batman-begins', 'launch', 'L''Ombre de Gotham', 'Lancer Batman Begins pour la première fois.', 'bronze', 15),
    ('batman-begins', 'complete', 'Le Chevalier Noir', 'Déjouer les plans de l''Épouvantail et sauver Gotham.', 'gold', 150),

    ('contra-advance', 'launch', 'Soldat d''Élite', 'Lancer Contra Advance pour la première fois.', 'bronze', 15),
    ('contra-advance', 'complete', 'Destructeur d''Envahisseurs', 'Terrasser l''armée extraterrestre et sauver l''humanité.', 'gold', 150),

    ('contra-3', 'launch', 'Défenseur Terrestre', 'Lancer Contra III pour la première fois.', 'bronze', 15),
    ('contra-3', 'complete', 'Guerre des Mondes', 'Terminer Contra III en mode Coopératif ou Solo.', 'gold', 150),

    ('doom-gba', 'launch', 'Entrée en Enfer', 'Lancer Doom pour la première fois.', 'bronze', 15),
    ('doom-gba', 'complete', 'Doom Slayer', 'Nettoyer tous les quartiers de Phobos de la vermine démoniaque.', 'gold', 150),

    ('doom-2-gba', 'launch', 'Retour au Combat', 'Lancer Doom II pour la première fois.', 'bronze', 15),
    ('doom-2-gba', 'complete', 'L''Enfer sur Terre', 'Terrasser l''Icône du Péché et refermer le portail infernal.', 'gold', 150),

    ('double-dragon-nes', 'launch', 'Justice de Rue', 'Lancer Double Dragon sur NES pour la première fois.', 'bronze', 15),
    ('double-dragon-nes', 'complete', 'Dragon Jumeau', 'Vaincre Willy et sauver Marian du gang des Black Warriors.', 'gold', 150),

    ('double-dragon-advance', 'launch', 'Poings de Fureur', 'Lancer Double Dragon Advance pour la première fois.', 'bronze', 15),
    ('double-dragon-advance', 'complete', 'Maître du Sou-Setsu-Ken', 'Terminer l''aventure et démanteler l''empire de la pègre.', 'gold', 150),

    ('dbz-super-butoden-2', 'launch', 'Défi des Combattants', 'Lancer Super Butoden 2 pour la première fois.', 'bronze', 15),
    ('dbz-super-butoden-2', 'complete', 'Guerrier de l''Espace', 'Terminer le mode Histoire avec la fin secrète.', 'gold', 150),

    ('dbz-supersonic-warriors', 'launch', 'Vol de Combat', 'Lancer Supersonic Warriors pour la première fois.', 'bronze', 15),
    ('dbz-supersonic-warriors', 'complete', 'Légende Cosmique', 'Compléter tous les embranchements de l''histoire alternative.', 'gold', 150),

    ('fifa-07-gba', 'launch', 'Coup d''Envoi', 'Lancer FIFA 07 pour la première fois.', 'bronze', 15),
    ('fifa-07-gba', 'complete', 'Champion de la Ligue', 'Remporter le championnat en mode Carrière.', 'gold', 150),

    ('fire-emblem-binding-blade', 'launch', 'Jeune Lord', 'Lancer The Binding Blade pour la première fois.', 'bronze', 15),
    ('fire-emblem-binding-blade', 'complete', 'Épée des Sceaux', 'Terrasser le Dragon Démoniaque et restaurer la paix à Elibe.', 'gold', 150),

    ('ghost-rider', 'launch', 'Pacte Infernal', 'Lancer Ghost Rider pour la première fois.', 'bronze', 15),
    ('ghost-rider', 'complete', 'Esprit de Vengeance', 'Renvoyer Mephisto en enfer et sauver votre âme.', 'gold', 150),

    ('kof-ex-neoblood', 'launch', 'Nouveau Challenger', 'Lancer KOF EX pour la première fois.', 'bronze', 15),
    ('kof-ex-neoblood', 'complete', 'Roi des Combattants', 'Vaincre le boss final et remporter le tournoi KOF.', 'gold', 150),

    ('kingdom-hearts-chain-of-memories', 'launch', 'Manoir de l''Oubli', 'Lancer Chain of Memories pour la première fois.', 'bronze', 15),
    ('kingdom-hearts-chain-of-memories', 'complete', 'Souvenirs Retrouvés', 'Atteindre le dernier étage et sceller les souvenirs de Sora.', 'gold', 150),

    ('tomb-raider-legend-gba', 'launch', 'Archéologue Novice', 'Lancer Tomb Raider Legend pour la première fois.', 'bronze', 15),
    ('tomb-raider-legend-gba', 'complete', 'Excalibur', 'Reconstituer l''épée légendaire et percer les secrets du passé.', 'gold', 150),

    ('mario-vs-donkey-kong', 'launch', 'Jouets Volés', 'Lancer Mario vs. Donkey Kong pour la première fois.', 'bronze', 15),
    ('mario-vs-donkey-kong', 'complete', 'Grand Sauvetage', 'Récupérer tous les Mini-Mario et calmer Donkey Kong.', 'gold', 150),

    ('marvel-ultimate-alliance', 'launch', 'Rassemblement', 'Lancer Marvel: Ultimate Alliance pour la première fois.', 'bronze', 15),
    ('marvel-ultimate-alliance', 'complete', 'Sauveurs du Multivers', 'Terrasser le Docteur Fatalis et détruire son alliance maléfique.', 'gold', 150),

    ('marvel-war-of-gems', 'launch', 'Guerre des Gemmes', 'Lancer War of the Gems pour la première fois.', 'bronze', 15),
    ('marvel-war-of-gems', 'complete', 'Pouvoir Cosmique', 'Récupérer les 5 Gemmes de l''Infini et battre Thanos.', 'gold', 150),

    ('mega-man-zero', 'launch', 'Réveil du Héros', 'Lancer Mega Man Zero pour la première fois.', 'bronze', 15),
    ('mega-man-zero', 'complete', 'Résistance Victorieuse', 'Terrasser Copy X et libérer Neo Arcadia.', 'gold', 150),

    ('mortal-kombat-snes', 'launch', 'Tournoi Sacré', 'Lancer Mortal Kombat sur SNES pour la première fois.', 'bronze', 15),
    ('mortal-kombat-snes', 'complete', 'Fatality Suprême', 'Vaincre Shang Tsung et remporter le grand tournoi.', 'gold', 150),

    ('mortal-kombat-deadly-alliance', 'launch', 'Alliance Maudite', 'Lancer Deadly Alliance pour la première fois.', 'bronze', 15),
    ('mortal-kombat-deadly-alliance', 'complete', 'Fin de l''Alliance', 'Terrasser Shang Tsung et Quan Chi dans l''arène finale.', 'gold', 150),

    ('mortal-kombat-tournament-edition', 'launch', 'Guerrier Exclusif', 'Lancer Tournament Edition pour la première fois.', 'bronze', 15),
    ('mortal-kombat-tournament-edition', 'complete', 'Maître du Destin', 'Terminer le mode Tournoi avec le score maximal.', 'gold', 150),

    ('mortal-kombat-2', 'launch', 'Colère de Shao Kahn', 'Lancer Mortal Kombat II pour la première fois.', 'bronze', 15),
    ('mortal-kombat-2', 'complete', 'Fatality II', 'Vaincre Shao Kahn et libérer le royaume d''Outremonde.', 'gold', 150),

    ('nfs-underground-2', 'launch', 'Pilote Amateur', 'Lancer NFS Underground 2 pour la première fois.', 'bronze', 15),
    ('nfs-underground-2', 'complete', 'Roi du Tuning', 'Devenir le pilote le plus respecté de la ville.', 'gold', 150),

    ('ninja-gaiden-trilogy', 'launch', 'Lignée du Dragon', 'Lancer Ninja Gaiden Trilogy pour la première fois.', 'bronze', 15),
    ('ninja-gaiden-trilogy', 'complete', 'Maître Ninja', 'Terminer les trois aventures légendaires de Ryu Hayabusa.', 'gold', 150),

    ('prince-of-persia-sands-of-time', 'launch', 'Sables du Temps', 'Lancer Sands of Time pour la première fois.', 'bronze', 15),
    ('prince-of-persia-sands-of-time', 'complete', 'Vizir Déchu', 'Refermer le sablier géant et terrasser le traître Vizir.', 'gold', 150),

    ('shaman-king-master-of-spirits', 'launch', 'Fusion d''Âmes', 'Lancer Master of Spirits pour la première fois.', 'bronze', 15),
    ('shaman-king-master-of-spirits', 'complete', 'Shaman King', 'Vaincre Zeke Asakura et remporter le Shaman Fight.', 'gold', 150),

    ('sonic-battle', 'launch', 'Combat d''Émeraudes', 'Lancer Sonic Battle pour la première fois.', 'bronze', 15),
    ('sonic-battle', 'complete', 'Éveil d''Emerl', 'Maximiser toutes les compétences du robot Emerl.', 'gold', 150),

    ('spiderman-animated-snes', 'launch', 'Dessin Animé Rétro', 'Lancer Spider-Man: The Animated Series pour la première fois.', 'bronze', 15),
    ('spiderman-animated-snes', 'complete', 'Justice du Tisseur', 'Vaincre le Caïd et tous les super-vilains de New York.', 'gold', 150),

    ('spiderman-3-gba', 'launch', 'Costume Sombre', 'Lancer Spider-Man 3 pour la première fois.', 'bronze', 15),
    ('spiderman-3-gba', 'complete', 'Rédemption de New York', 'Vaincre l''Homme-Sable et Venom pour sauver Mary Jane.', 'gold', 150),

    ('street-fighter-5-hack', 'launch', 'Futur Rétro', 'Lancer Street Fighter V (Hack) pour la première fois.', 'bronze', 15),
    ('street-fighter-5-hack', 'complete', 'Guerrier Virtuel', 'Terminer le mode Arcade avec les personnages modifiés.', 'gold', 150),

    ('street-fighter-alpha-2-snes', 'launch', 'Guerrier Alpha', 'Lancer Street Fighter Alpha 2 pour la première fois.', 'bronze', 15),
    ('street-fighter-alpha-2-snes', 'complete', 'Combattant Ultime', 'Vaincre Akuma et triompher de tous les challengers.', 'gold', 150),

    ('street-fighter-2-turbo', 'launch', 'Vitesse Maximale', 'Lancer Street Fighter II Turbo pour la première fois.', 'bronze', 15),
    ('street-fighter-2-turbo', 'complete', 'Grand Maître', 'Vaincre M. Bison à la vitesse maximale du jeu.', 'gold', 150),

    ('yoshis-island-gba', 'launch', 'Île des Yoshis', 'Lancer Yoshi''s Island pour la première fois.', 'bronze', 15),
    ('yoshis-island-gba', 'complete', 'Bébé Sauvé', 'Vaincre Bébé Bowser et réunir les frères Mario.', 'gold', 150),

    ('super-street-fighter-2-turbo-revival', 'launch', 'Nouveau Défi', 'Lancer Super Street Fighter II Turbo pour la première fois.', 'bronze', 15),
    ('super-street-fighter-2-turbo-revival', 'complete', 'Légende Vivante', 'Terminer le mode Arcade avec le rang de combattant suprême.', 'gold', 150),

    ('tmnt-gba', 'launch', 'Pouvoir Tortue', 'Lancer Teenage Mutant Ninja Turtles pour la première fois.', 'bronze', 15),
    ('tmnt-gba', 'complete', 'Foot Clan Démantelé', 'Battre Shredder dans un duel de ninjas légendaire.', 'gold', 150),

    ('tekken-advance', 'launch', 'Tournoi Iron Fist', 'Lancer Tekken Advance pour la première fois.', 'bronze', 15),
    ('tekken-advance', 'complete', 'Poing de Fer', 'Vaincre Heihachi Mishima et remporter le tournoi.', 'gold', 150),

    ('toy-story-snes', 'launch', 'Vers l''Infini', 'Lancer Toy Story sur SNES pour la première fois.', 'bronze', 15),
    ('toy-story-snes', 'complete', 'Au-Delà !', 'Terminer tous les niveaux et aider Buzz et Woody à rentrer.', 'gold', 150),

    ('ultimate-mortal-kombat-3', 'launch', 'Combat Cybernétique', 'Lancer Ultimate Mortal Kombat 3 pour la première fois.', 'bronze', 15),
    ('ultimate-mortal-kombat-3', 'complete', 'Guerrier Suprême', 'Vaincre Shao Kahn et libérer les âmes captives.', 'gold', 150),

    ('ultimate-spiderman-gba', 'launch', 'Ombre et Toile', 'Lancer Ultimate Spider-Man pour la première fois.', 'bronze', 15),
    ('ultimate-spiderman-gba', 'complete', 'Destruction Mutuelle', 'Compléter l''histoire du point de vue de Spider-Man et de Venom.', 'gold', 150)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
