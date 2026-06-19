'use client';

import { supabase } from '@/utils/supabase/client';
import type { Game, Profile, ProfileData, Trophy, TrophyTier } from '@/types';

/**
 * Couche d'accès aux données — SOURCE DE VÉRITÉ UNIQUE = Supabase.
 * Remplace les constantes DEFAULT_GAMES / MOCK_TROPHIES et le localStorage.
 * Toutes les fonctions respectent la RLS (client navigateur authentifié).
 */

// ── PROFIL ────────────────────────────────────────────────────────────────

/** Récupère le profil applicatif complet (profil + jeux possédés via purchases). */
export async function fetchProfileData(userId: string): Promise<ProfileData | null> {
  const [{ data: profile }, { data: purchases }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('purchases').select('game_id').eq('user_id', userId),
  ]);

  if (!profile) return null;
  const p = profile as Profile;

  return {
    id: p.id,
    username: p.username,
    avatar: p.avatar_url || '',
    funnyCoins: Number(p.funny_coins),
    accountType: p.account_type,
    ownedGames: (purchases ?? []).map((r: { game_id: string }) => r.game_id),
    hasRecovery: p.has_recovery,
    recoveryEmail: p.recovery_email,
  };
}

/** Met à jour des champs autorisés du profil (username, avatar, type). Coins/achats passent par RPC. */
export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'username' | 'avatar_url' | 'account_type'>>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

// ── JEUX ──────────────────────────────────────────────────────────────────

/** Catalogue public (jeux publiés) trié par date. */
export async function fetchPublishedGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Game[];
}

/** Jeux d'un auteur (créateur) — inclut les brouillons. */
export async function fetchGamesByAuthor(authorId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Game[];
}

export async function fetchGameBySlug(slug: string): Promise<Game | null> {
  const { data } = await supabase.from('games').select('*').eq('slug', slug).single();
  return (data as Game) ?? null;
}

export async function fetchGameById(id: string): Promise<Game | null> {
  const { data } = await supabase.from('games').select('*').eq('id', id).single();
  return (data as Game) ?? null;
}

/** Publication d'un nouveau jeu par un créateur. Renvoie le jeu créé. */
export async function publishGame(
  authorId: string,
  game: Omit<Game, 'id' | 'author_id' | 'play_count' | 'rating' | 'rating_count' | 'created_at'>
): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert({ ...game, author_id: authorId })
    .select()
    .single();
  if (error) throw error;
  return data as Game;
}

export async function deleteGame(gameId: string): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', gameId);
  if (error) throw error;
}

/** Change le statut d'un jeu (ex: 'draft' → 'published' après upload des fichiers). */
export async function setGameStatus(gameId: string, status: 'draft' | 'published'): Promise<void> {
  const { error } = await supabase.from('games').update({ status }).eq('id', gameId);
  if (error) throw error;
}

/** Compteur de parties (fonction Postgres). Non bloquant pour le gameplay. */
export async function incrementPlayCount(gameId: string): Promise<void> {
  await supabase.rpc('increment_play_count', { p_game_id: gameId });
}

// ── ACHATS (RPC atomique côté serveur) ──────────────────────────────────────

/**
 * Achète un jeu de façon atomique (débit coins + possession) via la fonction
 * Postgres buy_game(). Lève une erreur explicite si coins insuffisants.
 */
export async function buyGame(gameId: string): Promise<void> {
  const { error } = await supabase.rpc('buy_game', { p_game_id: gameId });
  if (error) throw new Error(error.message);
}

// ── TROPHÉES ────────────────────────────────────────────────────────────────

export async function fetchTrophiesForGame(gameId: string): Promise<Trophy[]> {
  const { data, error } = await supabase
    .from('trophies')
    .select('*')
    .eq('game_id', gameId)
    .order('coin_reward', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Trophy[];
}

export async function fetchUnlockedTrophyIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_trophies')
    .select('trophy_id')
    .eq('user_id', userId);
  return (data ?? []).map((r: { trophy_id: string }) => r.trophy_id);
}

/**
 * Débloque un trophée par son UUID. Le trigger SQL crédite les FunnyCoins.
 * Idempotent : une 2ᵉ tentative (déjà débloqué) est traitée comme un succès.
 */
export async function unlockTrophy(userId: string, trophyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_trophies')
    .insert({ user_id: userId, trophy_id: trophyId });
  if (!error) return true;
  if (error.code === '23505') return true; // déjà débloqué
  throw error;
}

export interface UnlockedTrophyInfo {
  id: string;
  trophy_key: string;
  name: string;
  description: string;
  tier: TrophyTier;
  coin_reward: number;
}

/**
 * Débloque un trophée à partir de sa CLÉ STABLE (clé propre au jeu).
 * Utilisé par le code des jeux via window.funnyStation.unlockTrophy('first_steps').
 * Renvoie les infos du trophée (pour l'overlay) ou null si la clé est inconnue.
 */
export async function unlockTrophyByKey(
  userId: string,
  gameId: string,
  key: string
): Promise<UnlockedTrophyInfo | null> {
  const { data: trophy } = await supabase
    .from('trophies')
    .select('id, trophy_key, name, description, tier, coin_reward')
    .eq('game_id', gameId)
    .eq('trophy_key', key)
    .single();

  if (!trophy) return null;

  const { error } = await supabase
    .from('user_trophies')
    .insert({ user_id: userId, trophy_id: trophy.id });
  if (error && error.code !== '23505') throw error; // 23505 = déjà débloqué (OK)

  return trophy as UnlockedTrophyInfo;
}

// ── NOTES ────────────────────────────────────────────────────────────────────

export async function rateGame(userId: string, gameId: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('game_ratings')
    .upsert({ user_id: userId, game_id: gameId, score });
  if (error) throw error;
}
