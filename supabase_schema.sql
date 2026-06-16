-- ══════════════════════════════════════════════════════════════
-- FUNNY STATION : DATABASE ARCHITECTURE (Universal Console)
-- ══════════════════════════════════════════════════════════════

-- Active l'extension uuid-ossp pour la génération d'IDs uniques
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Types de runtimes supportés
DO $$ BEGIN
    CREATE TYPE game_runtime AS ENUM ('js', 'wasm', 'python', 'lua', 'java');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE trophy_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Table des profils utilisateurs (Liée à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    funny_coins BIGINT DEFAULT 500 CHECK (funny_coins >= 0),
    online_status BOOLEAN DEFAULT FALSE,
    current_lobby_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Profils
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut voir les profils" 
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Table des Jeux (Métadonnées & Configuration)
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    runtime game_runtime NOT NULL DEFAULT 'js',
    entry_point TEXT NOT NULL,                  -- ex: "index.js", "main.py", "game.wasm"
    assets_bucket_path TEXT NOT NULL,           -- Chemin d'accès dans Supabase Storage
    background_url TEXT,                        -- Arrière-plan PS5 dynamique lors du focus
    ambient_music_url TEXT,                     -- Musique de fond lors du focus
    manifest JSONB DEFAULT '{}'::jsonb,         -- Configuration des dépendances, RAM max, etc.
    author_id UUID REFERENCES public.profiles(id),
    play_count BIGINT DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Jeux
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les jeux sont publics" 
    ON public.games FOR SELECT USING (true);

CREATE POLICY "Les auteurs peuvent insérer des jeux" 
    ON public.games FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 3. Table des Sauvegardes & VFS Cloud Sync
CREATE TABLE IF NOT EXISTS public.game_saves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    slot_name TEXT NOT NULL DEFAULT 'auto',
    save_data BYTEA NOT NULL,                   -- Données de sauvegarde binaires / compressées
    checksum TEXT NOT NULL,                     -- Vérification d'intégrité
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_game_slot UNIQUE(user_id, game_id, slot_name)
);

-- RLS Sauvegardes
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs gèrent leurs propres sauvegardes" 
    ON public.game_saves FOR ALL USING (auth.uid() = user_id);

-- 4. Table des Trophées
CREATE TABLE IF NOT EXISTS public.trophies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    tier trophy_tier NOT NULL DEFAULT 'bronze',
    coin_reward INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Trophées
ALTER TABLE public.trophies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les trophées sont publics" 
    ON public.trophies FOR SELECT USING (true);

-- 5. Table d'obtention des Trophées par les joueurs
CREATE TABLE IF NOT EXISTS public.user_trophies (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    trophy_id UUID REFERENCES public.trophies(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, trophy_id)
);

-- RLS Obtention Trophées
ALTER TABLE public.user_trophies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des trophées débloqués" 
    ON public.user_trophies FOR SELECT USING (true);

CREATE POLICY "L'utilisateur insère son propre trophée" 
    ON public.user_trophies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Trigger pour attribuer les FunnyCoins lors de l'obtention d'un trophée
CREATE OR REPLACE FUNCTION reward_user_with_coins()
RETURNS TRIGGER AS $$
DECLARE
    reward_amount INT;
BEGIN
    -- Récupère le montant de FunnyCoins associé au trophée débloqué
    SELECT coin_reward INTO reward_amount FROM public.trophies WHERE id = NEW.trophy_id;
    
    -- Met à jour le solde de l'utilisateur
    UPDATE public.profiles 
    SET funny_coins = funny_coins + reward_amount 
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_trophy_unlocked
    AFTER INSERT ON public.user_trophies
    FOR EACH ROW EXECUTE FUNCTION reward_user_with_coins();

-- 7. Index de performance
CREATE INDEX IF NOT EXISTS idx_games_runtime ON public.games(runtime);
CREATE INDEX IF NOT EXISTS idx_game_saves_user ON public.game_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trophies_user ON public.user_trophies(user_id);
