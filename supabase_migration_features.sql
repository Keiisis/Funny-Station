-- ══════════════════════════════════════════════════════════════════════════
-- FUNNY STATION : MIGRATION — 18 NOUVELLES FONCTIONNALITÉS
-- ──────────────────────────────────────────────────────────────────────────
-- À exécuter dans : Supabase Dashboard > SQL Editor (idempotent).
-- ══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. TYPES ÉNUMÉRÉS ADDITIONNELS
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE TYPE friendship_status AS ENUM ('pending','accepted','blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('friend_request','friend_accepted','room_invite','trophy_unlocked','new_game','message','daily_reward','level_up','season_reward'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE leaderboard_period AS ENUM ('weekly','monthly','alltime'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE chat_channel_type AS ENUM ('room','private','global'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE season_status AS ENUM ('active','ended','upcoming'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE screenshot_type AS ENUM ('screenshot','clip'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. FRIENDSHIPS (Système d'amis)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.friendships (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status      friendship_status NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id),
    CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own friendships" ON public.friendships;
CREATE POLICY "Users see own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users send friend requests" ON public.friendships;
CREATE POLICY "Users send friend requests"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users manage own friendships" ON public.friendships;
CREATE POLICY "Users manage own friendships"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users delete own friendships" ON public.friendships;
CREATE POLICY "Users delete own friendships"
    ON public.friendships FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- ═══════════════════════════════════════════════════════════════
-- 3. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications"
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
    ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- Fonction utilitaire pour créer une notification (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (p_user_id, p_type, p_title, p_body, p_payload)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════════
-- 4. LEADERBOARD SCORES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id     UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    score       BIGINT NOT NULL DEFAULT 0,
    period      leaderboard_period NOT NULL DEFAULT 'alltime',
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_game_period UNIQUE (user_id, game_id, period)
);

ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboards are public" ON public.leaderboard_scores;
CREATE POLICY "Leaderboards are public"
    ON public.leaderboard_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users submit own scores" ON public.leaderboard_scores;
CREATE POLICY "Users submit own scores"
    ON public.leaderboard_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own scores" ON public.leaderboard_scores;
CREATE POLICY "Users update own scores"
    ON public.leaderboard_scores FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_game ON public.leaderboard_scores(game_id, period, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON public.leaderboard_scores(user_id);

-- RPC : soumettre un score (ne garde que le meilleur)
CREATE OR REPLACE FUNCTION public.submit_score(
    p_game_id UUID,
    p_score BIGINT,
    p_period leaderboard_period DEFAULT 'alltime',
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS public.leaderboard_scores AS $$
DECLARE
    v_user UUID := auth.uid();
    v_row public.leaderboard_scores;
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
    
    INSERT INTO public.leaderboard_scores (user_id, game_id, score, period, metadata)
    VALUES (v_user, p_game_id, p_score, p_period, p_metadata)
    ON CONFLICT (user_id, game_id, period)
    DO UPDATE SET
        score = GREATEST(leaderboard_scores.score, EXCLUDED.score),
        metadata = CASE WHEN EXCLUDED.score > leaderboard_scores.score THEN EXCLUDED.metadata ELSE leaderboard_scores.metadata END,
        created_at = CASE WHEN EXCLUDED.score > leaderboard_scores.score THEN NOW() ELSE leaderboard_scores.created_at END
    RETURNING * INTO v_row;
    
    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════════
-- 5. GAME TAGS & CATÉGORIES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.game_tags (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name    TEXT UNIQUE NOT NULL,
    slug    TEXT UNIQUE NOT NULL,
    color   TEXT NOT NULL DEFAULT '#3b82f6',
    icon    TEXT
);

ALTER TABLE public.game_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tags are public" ON public.game_tags;
CREATE POLICY "Tags are public" ON public.game_tags FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.game_tag_map (
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES public.game_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, tag_id)
);

ALTER TABLE public.game_tag_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tag mappings are public" ON public.game_tag_map;
CREATE POLICY "Tag mappings are public" ON public.game_tag_map FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators manage tag mappings" ON public.game_tag_map;
CREATE POLICY "Creators manage tag mappings" ON public.game_tag_map FOR ALL
    USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.author_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_game_tag_map_game ON public.game_tag_map(game_id);
CREATE INDEX IF NOT EXISTS idx_game_tag_map_tag ON public.game_tag_map(tag_id);

-- Seed des tags de base
INSERT INTO public.game_tags (name, slug, color, icon) VALUES
    ('Action', 'action', '#ef4444', '⚔️'),
    ('Aventure', 'aventure', '#f59e0b', '🗺️'),
    ('Puzzle', 'puzzle', '#8b5cf6', '🧩'),
    ('Course', 'course', '#10b981', '🏎️'),
    ('RPG', 'rpg', '#6366f1', '🎭'),
    ('Sport', 'sport', '#06b6d4', '⚽'),
    ('Horreur', 'horreur', '#991b1b', '👻'),
    ('Plateforme', 'plateforme', '#ec4899', '🦘'),
    ('Stratégie', 'strategie', '#0ea5e9', '♟️'),
    ('Combat', 'combat', '#dc2626', '🥊'),
    ('Arcade', 'arcade', '#a855f7', '🕹️'),
    ('Simulation', 'simulation', '#14b8a6', '🛩️')
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 6. DAILY REWARDS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.daily_rewards (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    streak      INTEGER NOT NULL DEFAULT 1,
    last_claim  DATE NOT NULL DEFAULT CURRENT_DATE,
    total_claims INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_daily_user UNIQUE (user_id)
);

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own daily" ON public.daily_rewards;
CREATE POLICY "Users see own daily"
    ON public.daily_rewards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own daily" ON public.daily_rewards;
CREATE POLICY "Users manage own daily"
    ON public.daily_rewards FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RPC : réclamer la récompense quotidienne
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS JSONB AS $$
DECLARE
    v_user UUID := auth.uid();
    v_row public.daily_rewards;
    v_reward INTEGER;
    v_new_streak INTEGER;
    v_base_reward INTEGER := 50;
    v_streak_bonus INTEGER := 10;
    v_max_streak_bonus INTEGER := 200;
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;

    SELECT * INTO v_row FROM public.daily_rewards WHERE user_id = v_user;

    IF v_row IS NOT NULL AND v_row.last_claim = CURRENT_DATE THEN
        RETURN jsonb_build_object('already_claimed', true, 'streak', v_row.streak, 'reward', 0);
    END IF;

    IF v_row IS NULL THEN
        v_new_streak := 1;
    ELSIF v_row.last_claim = CURRENT_DATE - 1 THEN
        v_new_streak := v_row.streak + 1;
    ELSE
        v_new_streak := 1;
    END IF;

    v_reward := v_base_reward + LEAST(v_new_streak * v_streak_bonus, v_max_streak_bonus);

    INSERT INTO public.daily_rewards (user_id, streak, last_claim, total_claims)
    VALUES (v_user, v_new_streak, CURRENT_DATE, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
        streak = v_new_streak,
        last_claim = CURRENT_DATE,
        total_claims = daily_rewards.total_claims + 1;

    UPDATE public.profiles SET funny_coins = funny_coins + v_reward, updated_at = NOW()
    WHERE id = v_user;

    RETURN jsonb_build_object('already_claimed', false, 'streak', v_new_streak, 'reward', v_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════════
-- 7. PLAYER LEVELS / XP
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.player_levels (
    user_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    xp          BIGINT NOT NULL DEFAULT 0,
    level       INTEGER NOT NULL DEFAULT 1,
    title       TEXT NOT NULL DEFAULT 'Rookie',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.player_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Levels are public" ON public.player_levels;
CREATE POLICY "Levels are public" ON public.player_levels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own level" ON public.player_levels;
CREATE POLICY "Users manage own level"
    ON public.player_levels FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RPC : ajouter de l'XP et calculer le niveau
CREATE OR REPLACE FUNCTION public.add_xp(p_amount INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_user UUID := auth.uid();
    v_row public.player_levels;
    v_new_xp BIGINT;
    v_new_level INTEGER;
    v_old_level INTEGER;
    v_title TEXT;
    v_leveled_up BOOLEAN := FALSE;
    v_xp_per_level INTEGER := 500;
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
    IF p_amount <= 0 THEN RETURN jsonb_build_object('xp', 0, 'level', 1, 'leveled_up', false); END IF;

    INSERT INTO public.player_levels (user_id, xp, level, title)
    VALUES (v_user, 0, 1, 'Rookie')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_row FROM public.player_levels WHERE user_id = v_user;
    v_old_level := v_row.level;
    v_new_xp := v_row.xp + p_amount;
    v_new_level := GREATEST(1, FLOOR(v_new_xp::numeric / v_xp_per_level) + 1)::INTEGER;

    v_title := CASE
        WHEN v_new_level >= 50 THEN 'Légende'
        WHEN v_new_level >= 40 THEN 'Maître'
        WHEN v_new_level >= 30 THEN 'Expert'
        WHEN v_new_level >= 20 THEN 'Vétéran'
        WHEN v_new_level >= 15 THEN 'Champion'
        WHEN v_new_level >= 10 THEN 'Pro Gamer'
        WHEN v_new_level >= 5  THEN 'Joueur'
        ELSE 'Rookie'
    END;

    v_leveled_up := v_new_level > v_old_level;

    UPDATE public.player_levels
    SET xp = v_new_xp, level = v_new_level, title = v_title, updated_at = NOW()
    WHERE user_id = v_user;

    IF v_leveled_up THEN
        PERFORM public.create_notification(
            v_user,
            'level_up',
            'Niveau ' || v_new_level || ' atteint !',
            'Tu es maintenant ' || v_title || '. Continue comme ça !',
            jsonb_build_object('level', v_new_level, 'title', v_title)
        );
    END IF;

    RETURN jsonb_build_object('xp', v_new_xp, 'level', v_new_level, 'title', v_title, 'leveled_up', v_leveled_up);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger : ajouter 25 XP à chaque trophée débloqué
CREATE OR REPLACE FUNCTION public.xp_on_trophy()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.add_xp(25);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_trophy_xp ON public.user_trophies;
CREATE TRIGGER on_trophy_xp
    AFTER INSERT ON public.user_trophies
    FOR EACH ROW EXECUTE FUNCTION public.xp_on_trophy();

-- ═══════════════════════════════════════════════════════════════
-- 8. CHAT MESSAGES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_type chat_channel_type NOT NULL DEFAULT 'global',
    channel_id  TEXT NOT NULL,
    content     TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see chat messages" ON public.chat_messages;
CREATE POLICY "Users see chat messages"
    ON public.chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users send chat messages" ON public.chat_messages;
CREATE POLICY "Users send chat messages"
    ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_channel ON public.chat_messages(channel_type, channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON public.chat_messages(sender_id);

-- ═══════════════════════════════════════════════════════════════
-- 9. SEASONS & SEASON REWARDS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.seasons (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    description TEXT,
    status      season_status NOT NULL DEFAULT 'upcoming',
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seasons are public" ON public.seasons;
CREATE POLICY "Seasons are public" ON public.seasons FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.season_rewards (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id   UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    tier        INTEGER NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    reward_type TEXT NOT NULL DEFAULT 'coins',
    reward_value INTEGER NOT NULL DEFAULT 0,
    icon_url    TEXT,
    is_premium  BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.season_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Season rewards are public" ON public.season_rewards;
CREATE POLICY "Season rewards are public" ON public.season_rewards FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.season_progress (
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    season_id   UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    xp          BIGINT NOT NULL DEFAULT 0,
    tier_reached INTEGER NOT NULL DEFAULT 0,
    is_premium  BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_rewards UUID[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (user_id, season_id)
);

ALTER TABLE public.season_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own season progress" ON public.season_progress;
CREATE POLICY "Users see own season progress"
    ON public.season_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own season progress" ON public.season_progress;
CREATE POLICY "Users manage own season progress"
    ON public.season_progress FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_season_rewards_season ON public.season_rewards(season_id, tier);

-- Seed d'une saison initiale
INSERT INTO public.seasons (name, description, status, starts_at, ends_at) VALUES
    ('Saison 1 : Neon Genesis', 'La première saison de Funny Station ! Débloquez des récompenses exclusives.', 'active', NOW(), NOW() + INTERVAL '90 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 10. SCREENSHOTS & CLIPS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.screenshots (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id     UUID REFERENCES public.games(id) ON DELETE SET NULL,
    type        screenshot_type NOT NULL DEFAULT 'screenshot',
    url         TEXT NOT NULL,
    thumbnail_url TEXT,
    caption     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Screenshots are public" ON public.screenshots;
CREATE POLICY "Screenshots are public" ON public.screenshots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own screenshots" ON public.screenshots;
CREATE POLICY "Users manage own screenshots"
    ON public.screenshots FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_screenshots_user ON public.screenshots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_game ON public.screenshots(game_id);

-- ═══════════════════════════════════════════════════════════════
-- 11. USER PLAYLISTS & TRACKS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_playlists (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public playlists visible" ON public.user_playlists;
CREATE POLICY "Public playlists visible"
    ON public.user_playlists FOR SELECT
    USING (is_public = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own playlists" ON public.user_playlists;
CREATE POLICY "Users manage own playlists"
    ON public.user_playlists FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.user_playlists(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    artist      TEXT,
    url         TEXT NOT NULL,
    duration    INTEGER,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tracks follow playlist visibility" ON public.playlist_tracks;
CREATE POLICY "Tracks follow playlist visibility"
    ON public.playlist_tracks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.user_playlists p
        WHERE p.id = playlist_id AND (p.is_public = TRUE OR p.user_id = auth.uid())
    ));

DROP POLICY IF EXISTS "Users manage own tracks" ON public.playlist_tracks;
CREATE POLICY "Users manage own tracks"
    ON public.playlist_tracks FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.user_playlists p
        WHERE p.id = playlist_id AND p.user_id = auth.uid()
    ));

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id, position);

-- ═══════════════════════════════════════════════════════════════
-- 12. USER SETTINGS (Personnalisation + i18n)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    locale          TEXT NOT NULL DEFAULT 'fr',
    theme           TEXT NOT NULL DEFAULT 'auto',
    accent_color    TEXT NOT NULL DEFAULT '#3b82f6',
    wallpaper_url   TEXT,
    layout_mode     TEXT NOT NULL DEFAULT 'grid',
    reduce_motion   BOOLEAN NOT NULL DEFAULT FALSE,
    colorblind      BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own settings" ON public.user_settings;
CREATE POLICY "Users see own settings"
    ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;
CREATE POLICY "Users manage own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger : auto-créer les settings + player_levels à l'inscription
CREATE OR REPLACE FUNCTION public.init_user_features()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.player_levels (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_init_features ON public.profiles;
CREATE TRIGGER on_profile_init_features
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.init_user_features();

-- ═══════════════════════════════════════════════════════════════
-- 13. TRIGGER : Notification sur demande d'ami
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
BEGIN
    SELECT username INTO v_username FROM public.profiles WHERE id = NEW.requester_id;
    PERFORM public.create_notification(
        NEW.addressee_id,
        'friend_request',
        'Nouvelle demande d''ami',
        v_username || ' veut devenir ton ami !',
        jsonb_build_object('friendship_id', NEW.id, 'requester_id', NEW.requester_id, 'username', v_username)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_friend_request ON public.friendships;
CREATE TRIGGER on_friend_request
    AFTER INSERT ON public.friendships
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION public.notify_friend_request();

-- Trigger : Notification quand un ami accepte
CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        SELECT username INTO v_username FROM public.profiles WHERE id = NEW.addressee_id;
        PERFORM public.create_notification(
            NEW.requester_id,
            'friend_accepted',
            'Demande acceptée !',
            v_username || ' est maintenant ton ami.',
            jsonb_build_object('friendship_id', NEW.id, 'friend_id', NEW.addressee_id, 'username', v_username)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_friend_accepted ON public.friendships;
CREATE TRIGGER on_friend_accepted
    AFTER UPDATE ON public.friendships
    FOR EACH ROW EXECUTE FUNCTION public.notify_friend_accepted();

-- ═══════════════════════════════════════════════════════════════
-- 14. COLONNES ADDITIONNELLES SUR PROFILES (niveau visible)
-- ═══════════════════════════════════════════════════════════════

-- Ajouter current_game pour l'activité en temps réel
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN current_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN current_game_title TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- FIN DE LA MIGRATION
-- ═══════════════════════════════════════════════════════════════
