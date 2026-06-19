-- ══════════════════════════════════════════════════════════════════════════
-- FUNNY STATION : SCHÉMA DE BASE DE DONNÉES UNIFIÉ (Console Universelle en Ligne)
-- ──────────────────────────────────────────────────────────────────────────
-- Source de vérité UNIQUE du projet. Remplace l'ancien schéma + le fichier
-- divergent funny_station_database_architecture.txt (à supprimer).
--
-- À exécuter dans : Supabase Dashboard > SQL Editor (idempotent, ré-exécutable).
-- ══════════════════════════════════════════════════════════════════════════

-- Extensions ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- crypt()/gen_salt() pour le hash PIN

-- ══════════════════════════════════════════════════════════════════════════
-- 0. TYPES ÉNUMÉRÉS
-- ══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE game_runtime AS ENUM ('js', 'wasm', 'python', 'lua', 'java', 'gba', 'psp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE trophy_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('gamer', 'creator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE game_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 1. PROFILES  (1-1 avec auth.users)
--    Identité console : username + PIN ; email OPTIONNEL (récupération de compte).
--    L'email réel de connexion vit dans auth.users ; ici on garde le username
--    public et un flag indiquant si un email de récupération est rattaché.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        TEXT UNIQUE NOT NULL,
    avatar_url      TEXT,
    account_type    account_type NOT NULL DEFAULT 'gamer',
    funny_coins     BIGINT NOT NULL DEFAULT 500 CHECK (funny_coins >= 0),
    -- Email de récupération facultatif (le compte peut être créé sans).
    recovery_email  TEXT,
    has_recovery    BOOLEAN NOT NULL DEFAULT FALSE,
    online_status   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are public (read)" ON public.profiles;
CREATE POLICY "Profiles are public (read)"
    ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Note : pas de policy INSERT publique. Les profils sont créés par le trigger
-- handle_new_user() (SECURITY DEFINER), pas par le client.

-- ══════════════════════════════════════════════════════════════════════════
-- 2. GAMES  (catalogue réel, alimenté par les créateurs + seed)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.games (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    description         TEXT,
    runtime             game_runtime NOT NULL DEFAULT 'js',
    entry_point         TEXT NOT NULL,                    -- 'index.js', 'main.py', 'game.wasm'...
    assets_bucket_path  TEXT NOT NULL,                    -- ex: 'games/<id>' dans le bucket Storage
    background_url      TEXT,
    video_url           TEXT,                             -- trailer/cinématique en boucle
    ambient_music_url  TEXT,
    price               INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),  -- en FunnyCoins (0 = gratuit)
    manifest            JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { dependencies, maxMemoryMb, python_libs, screen_ratio }
    author_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status              game_status NOT NULL DEFAULT 'draft',
    play_count          BIGINT NOT NULL DEFAULT 0,
    rating              NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    rating_count        INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published games are public" ON public.games;
CREATE POLICY "Published games are public"
    ON public.games FOR SELECT
    USING (status = 'published' OR author_id = auth.uid());

DROP POLICY IF EXISTS "Creators insert own games" ON public.games;
CREATE POLICY "Creators insert own games"
    ON public.games FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Creators update own games" ON public.games;
CREATE POLICY "Creators update own games"
    ON public.games FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Creators delete own games" ON public.games;
CREATE POLICY "Creators delete own games"
    ON public.games FOR DELETE USING (auth.uid() = author_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 3. PURCHASES  (jeux possédés — table MANQUANTE dans l'ancien schéma)
--    Remplace le tableau ownedGames stocké en localStorage.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.purchases (
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id      UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    price_paid   INTEGER NOT NULL DEFAULT 0,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own purchases" ON public.purchases;
CREATE POLICY "Users read own purchases"
    ON public.purchases FOR SELECT USING (auth.uid() = user_id);

-- Pas d'INSERT direct : l'achat passe par la fonction RPC atomique buy_game().

-- ══════════════════════════════════════════════════════════════════════════
-- 4. TROPHIES & user_trophies
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.trophies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id     UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    -- Clé STABLE utilisée par le code des jeux : window.funnyStation.unlockTrophy('first_steps').
    -- Permet aux jeux de débloquer un trophée sans connaître son UUID.
    trophy_key  TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url    TEXT,
    tier        trophy_tier NOT NULL DEFAULT 'bronze',
    coin_reward INTEGER NOT NULL DEFAULT 10,
    hidden      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_game_trophy_key UNIQUE (game_id, trophy_key)
);

ALTER TABLE public.trophies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trophies are public" ON public.trophies;
CREATE POLICY "Trophies are public"
    ON public.trophies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators manage own game trophies" ON public.trophies;
CREATE POLICY "Creators manage own game trophies"
    ON public.trophies FOR ALL
    USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.author_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.user_trophies (
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trophy_id   UUID NOT NULL REFERENCES public.trophies(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, trophy_id)
);

ALTER TABLE public.user_trophies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Unlocked trophies are public (read)" ON public.user_trophies;
CREATE POLICY "Unlocked trophies are public (read)"
    ON public.user_trophies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users unlock own trophies" ON public.user_trophies;
CREATE POLICY "Users unlock own trophies"
    ON public.user_trophies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 5. GAME_SAVES  (Cloud Saves / VFS sync)
--    save_data en JSONB (le VFS sérialise ses fichiers en JSON). Plus simple et
--    robuste que BYTEA pour l'usage réel via supabase-js.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.game_saves (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id    UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    slot_name  TEXT NOT NULL DEFAULT 'cloud_sync',
    save_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
    checksum   TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_game_slot UNIQUE (user_id, game_id, slot_name)
);

ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saves" ON public.game_saves;
CREATE POLICY "Users manage own saves"
    ON public.game_saves FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 6. GAME_RATINGS  (note réelle par utilisateur → recalcule games.rating)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.game_ratings (
    user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id   UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    score     INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    rated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

ALTER TABLE public.game_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings are public (read)" ON public.game_ratings;
CREATE POLICY "Ratings are public (read)"
    ON public.game_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own rating" ON public.game_ratings;
CREATE POLICY "Users manage own rating"
    ON public.game_ratings FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 7. TRIGGERS & FONCTIONS
-- ══════════════════════════════════════════════════════════════════════════

-- 7.1 Crée automatiquement un profil à l'inscription auth.users.
--     Le username et l'account_type sont passés dans user_metadata à signUp().
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    meta_username TEXT;
    meta_avatar   TEXT;
    meta_type     TEXT;
    meta_recovery TEXT;
BEGIN
    meta_username := COALESCE(NEW.raw_user_meta_data->>'username', 'Joueur_' || substr(NEW.id::text, 1, 6));
    meta_avatar   := NEW.raw_user_meta_data->>'avatar_url';
    meta_type     := COALESCE(NEW.raw_user_meta_data->>'account_type', 'gamer');
    -- L'email de connexion est toujours synthétique ; l'email de récupération
    -- (facultatif) est transmis séparément via les métadonnées d'inscription.
    meta_recovery := NULLIF(TRIM(NEW.raw_user_meta_data->>'recovery_email'), '');

    INSERT INTO public.profiles (id, username, avatar_url, account_type, recovery_email, has_recovery)
    VALUES (
        NEW.id,
        meta_username,
        meta_avatar,
        meta_type::account_type,
        meta_recovery,
        meta_recovery IS NOT NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7.2 Récompense FunnyCoins au déblocage d'un trophée.
CREATE OR REPLACE FUNCTION public.reward_user_with_coins()
RETURNS TRIGGER AS $$
DECLARE
    reward_amount INTEGER;
BEGIN
    SELECT coin_reward INTO reward_amount FROM public.trophies WHERE id = NEW.trophy_id;
    UPDATE public.profiles
       SET funny_coins = funny_coins + COALESCE(reward_amount, 0),
           updated_at = NOW()
     WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_trophy_unlocked ON public.user_trophies;
CREATE TRIGGER on_trophy_unlocked
    AFTER INSERT ON public.user_trophies
    FOR EACH ROW EXECUTE FUNCTION public.reward_user_with_coins();

-- 7.3 Recalcule la note moyenne d'un jeu à chaque vote.
CREATE OR REPLACE FUNCTION public.recalc_game_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_game UUID := COALESCE(NEW.game_id, OLD.game_id);
BEGIN
    UPDATE public.games g
       SET rating = COALESCE((SELECT ROUND(AVG(score)::numeric, 2) FROM public.game_ratings WHERE game_id = target_game), 0),
           rating_count = (SELECT COUNT(*) FROM public.game_ratings WHERE game_id = target_game)
     WHERE g.id = target_game;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_game_rated ON public.game_ratings;
CREATE TRIGGER on_game_rated
    AFTER INSERT OR UPDATE OR DELETE ON public.game_ratings
    FOR EACH ROW EXECUTE FUNCTION public.recalc_game_rating();

-- 7.4 Achat atomique : débite les coins ET enregistre la possession en une transaction.
--     Empêche la triche/désync (tout passe côté serveur, RLS-safe).
CREATE OR REPLACE FUNCTION public.buy_game(p_game_id UUID)
RETURNS public.purchases AS $$
DECLARE
    v_user   UUID := auth.uid();
    v_price  INTEGER;
    v_author UUID;
    v_coins  BIGINT;
    v_row    public.purchases;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Authentification requise';
    END IF;

    SELECT price, author_id INTO v_price, v_author
      FROM public.games WHERE id = p_game_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jeu introuvable';
    END IF;

    -- Déjà possédé ou jeu gratuit ou auteur : possession immédiate sans débit.
    IF EXISTS (SELECT 1 FROM public.purchases WHERE user_id = v_user AND game_id = p_game_id) THEN
        SELECT * INTO v_row FROM public.purchases WHERE user_id = v_user AND game_id = p_game_id;
        RETURN v_row;
    END IF;

    IF v_price = 0 OR v_author = v_user THEN
        INSERT INTO public.purchases (user_id, game_id, price_paid)
        VALUES (v_user, p_game_id, 0) RETURNING * INTO v_row;
        RETURN v_row;
    END IF;

    SELECT funny_coins INTO v_coins FROM public.profiles WHERE id = v_user FOR UPDATE;
    IF v_coins < v_price THEN
        RAISE EXCEPTION 'FunnyCoins insuffisants (% requis, % disponibles)', v_price, v_coins;
    END IF;

    UPDATE public.profiles SET funny_coins = funny_coins - v_price, updated_at = NOW()
     WHERE id = v_user;

    INSERT INTO public.purchases (user_id, game_id, price_paid)
    VALUES (v_user, p_game_id, v_price) RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7.5 Incrémente le compteur de parties (appelé au lancement d'un jeu).
CREATE OR REPLACE FUNCTION public.increment_play_count(p_game_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.games SET play_count = play_count + 1 WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ══════════════════════════════════════════════════════════════════════════
-- 8. INDEX DE PERFORMANCE
-- ══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_games_runtime    ON public.games(runtime);
CREATE INDEX IF NOT EXISTS idx_games_status      ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_author      ON public.games(author_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user    ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_trophies_game     ON public.trophies(game_id);
CREATE INDEX IF NOT EXISTS idx_user_trophies_user ON public.user_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_user   ON public.game_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_game_ratings_game ON public.game_ratings(game_id);

-- ══════════════════════════════════════════════════════════════════════════
-- 9. STORAGE BUCKETS  (jeux + avatars, publics en lecture)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('game-assets', 'game-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique des assets de jeux.
DROP POLICY IF EXISTS "Public read game-assets" ON storage.objects;
CREATE POLICY "Public read game-assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'game-assets');

-- Upload des assets de jeux réservé aux utilisateurs authentifiés (créateurs).
-- L'upload de production passe par /api/install avec la service_role key (bypass RLS),
-- mais cette policy autorise aussi un upload client direct si besoin.
DROP POLICY IF EXISTS "Authenticated upload game-assets" ON storage.objects;
CREATE POLICY "Authenticated upload game-assets"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'game-assets');

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
    ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

-- ══════════════════════════════════════════════════════════════════════════
-- FIN DU SCHÉMA
-- ══════════════════════════════════════════════════════════════════════════
