-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Enregistrer les 3 jeux PSP et leurs Trophées
-- À exécuter dans : Supabase Dashboard > SQL Editor (bypasse les règles RLS)
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Insérer les jeux dans la table public.games
INSERT INTO public.games (title, slug, description, runtime, entry_point, assets_bucket_path, background_url, price, manifest, status)
VALUES 
  (
    'Assassin''s Creed: Bloodlines', 
    'assassins-creed-bloodlines',
    'Incarnez Altaïr dans sa traque des derniers Templiers sur l''île de Chypre. Un véritable Assassin''s Creed dans la paume de votre main, faisant le pont entre le premier jeu et Assassin''s Creed II.',
    'psp', 
    'Assassin''s Creed - Bloodlines (USA) (En,Fr,De,Es,It).cso', 
    '/games/PSP',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'God of War: Ghost of Sparta', 
    'god-of-war-ghost-of-sparta',
    'Découvrez les origines de la rage de Kratos et ses secrets de famille les plus sombres dans l''un des plus beaux chefs-d''œuvre de la PSP. Combattez les dieux et les monstres de la mythologie grecque.',
    'psp', 
    'God of War - Ghost of Sparta (USA) (En,Fr,Es).cso', 
    '/games/PSP',
    'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  ),
  (
    'Grand Theft Auto: Vice City Stories', 
    'gta-vice-city-stories',
    'Retournez à Vice City en 1984, deux ans avant les événements de GTA Vice City. Construisez votre propre empire criminel avec Vic Vance dans cette aventure en monde ouvert culte.',
    'psp', 
    'Grand Theft Auto - Vice City Stories (USA).cso', 
    '/games/PSP',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1470&auto=format&fit=crop',
    0, 
    '{}'::jsonb, 
    'published'
  )
ON CONFLICT (slug) DO UPDATE SET
  entry_point = EXCLUDED.entry_point,
  assets_bucket_path = EXCLUDED.assets_bucket_path,
  runtime = EXCLUDED.runtime,
  status = EXCLUDED.status;

-- 2. Insérer les trophées des jeux
INSERT INTO public.trophies (game_id, trophy_key, name, description, tier, coin_reward)
SELECT g.id, t.trophy_key, t.name, t.description, t.tier::trophy_tier, t.coin_reward
FROM (VALUES
    ('assassins-creed-bloodlines', 'templar_slayer', 'Premier Sang', 'Éliminer un capitaine templier sur l''île de Chypre.', 'bronze', 15),
    ('assassins-creed-bloodlines', 'memory_block', 'Chypre Libérée', 'Terminer tous les blocs de mémoire de l''aventure d''Altaïr.', 'gold', 150),
    
    ('god-of-war-ghost-of-sparta', 'atlantis_fall', 'Chute d''Atlantide', 'S''échapper de la cité engloutie d''Atlantide après avoir vaincu Scylla.', 'bronze', 15),
    ('god-of-war-ghost-of-sparta', 'ghost_of_sparta', 'Fantôme de Sparte', 'Battre Thanatos et venger le destin tragique de Deimos.', 'gold', 150),
    
    ('gta-vice-city-stories', 'soldier', 'De Retour au Pays', 'Terminer la première mission pour le sergent Jerry Martinez.', 'bronze', 15),
    ('gta-vice-city-stories', 'empire_state', 'Magnat de Vice City', 'Prendre le contrôle de toutes les entreprises de l''empire criminel.', 'gold', 150)
) AS t(slug, trophy_key, name, description, tier, coin_reward)
JOIN public.games g ON g.slug = t.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.trophies tr WHERE tr.game_id = g.id AND tr.trophy_key = t.trophy_key
);
