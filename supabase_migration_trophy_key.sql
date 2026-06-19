-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION : ajout de trophy_key (clé stable de déblocage côté jeu)
-- À exécuter UNE FOIS si tu as déjà lancé supabase_schema.sql + supabase_seed.sql
-- avant l'ajout de la colonne. Idempotent.
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Ajouter la colonne (nullable au départ pour ne pas casser les lignes existantes).
ALTER TABLE public.trophies ADD COLUMN IF NOT EXISTS trophy_key TEXT;

-- 2. Renseigner les clés des trophées de démo (par jeu + nom).
UPDATE public.trophies tr SET trophy_key = m.trophy_key
FROM (VALUES
    ('neon-runner',    'Premiers Pas',                'first_steps'),
    ('neon-runner',    'Légende de la Funny Station', 'legend'),
    ('pypyodide-math', 'Développeur Python',          'python_dev'),
    ('pypyodide-math', 'Maître Haptique',             'haptic_master'),
    ('lua-adventure',  'Aventurier Lua',              'lua_adventurer'),
    ('java-retro',     'Machine Java',                'java_machine')
) AS m(slug, name, trophy_key)
JOIN public.games g ON g.slug = m.slug
WHERE tr.game_id = g.id AND tr.name = m.name AND tr.trophy_key IS NULL;

-- 3. Pour toute ligne restée sans clé (trophées créés à la main), générer une clé de secours.
UPDATE public.trophies
SET trophy_key = 'trophy_' || substr(id::text, 1, 8)
WHERE trophy_key IS NULL;

-- 4. Verrouiller : NOT NULL + unicité par jeu.
ALTER TABLE public.trophies ALTER COLUMN trophy_key SET NOT NULL;

DO $$ BEGIN
    ALTER TABLE public.trophies ADD CONSTRAINT unique_game_trophy_key UNIQUE (game_id, trophy_key);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
