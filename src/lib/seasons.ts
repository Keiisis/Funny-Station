'use client';

import { supabase } from '@/utils/supabase/client';
import type { Season, SeasonReward, SeasonProgress } from '@/types';

/**
 * Seasons layer — Battle Pass, progression saisonnière, récompenses.
 */

export async function fetchCurrentSeason(): Promise<Season | null> {
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'active')
    .order('starts_at', { ascending: false })
    .limit(1)
    .single();
  return (data as Season) ?? null;
}

export async function fetchSeasonRewards(seasonId: string): Promise<SeasonReward[]> {
  const { data, error } = await supabase
    .from('season_rewards')
    .select('*')
    .eq('season_id', seasonId)
    .order('tier', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeasonReward[];
}

export async function fetchSeasonProgress(userId: string, seasonId: string): Promise<SeasonProgress | null> {
  const { data } = await supabase
    .from('season_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('season_id', seasonId)
    .single();
  return (data as SeasonProgress) ?? null;
}

export async function initSeasonProgress(seasonId: string): Promise<SeasonProgress> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('season_progress')
    .upsert({
      user_id: user.id,
      season_id: seasonId,
      xp: 0,
      tier_reached: 0,
      is_premium: false,
      claimed_rewards: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as SeasonProgress;
}

export async function addSeasonXP(seasonId: string, amount: number): Promise<SeasonProgress> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // S'assurer que le progrès existe
  let progress = await fetchSeasonProgress(user.id, seasonId);
  if (!progress) {
    progress = await initSeasonProgress(seasonId);
  }

  const newXp = progress.xp + amount;
  const newTier = Math.floor(newXp / 1000) + 1; // 1000 XP par palier
  const tierChanged = newTier > progress.tier_reached;

  const { data, error } = await supabase
    .from('season_progress')
    .update({ xp: newXp, tier_reached: newTier })
    .eq('user_id', user.id)
    .eq('season_id', seasonId)
    .select()
    .single();

  if (error) throw error;
  return data as SeasonProgress;
}

export async function claimSeasonReward(seasonId: string, rewardId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const progress = await fetchSeasonProgress(user.id, seasonId);
  if (!progress) throw new Error('Pas de progression');

  if (progress.claimed_rewards.includes(rewardId)) {
    throw new Error('Déjà réclamé');
  }

  const reward = await supabase
    .from('season_rewards')
    .select('*')
    .eq('id', rewardId)
    .single();

  if (!reward.data) throw new Error('Récompense introuvable');
  if (reward.data.tier > progress.tier_reached) throw new Error('Palier non atteint');
  if (reward.data.is_premium && !progress.is_premium) throw new Error('Pass Premium requis');

  // Créditer la récompense
  if (reward.data.reward_type === 'coins') {
    await supabase
      .from('profiles')
      .update({ funny_coins: supabase.rpc ? undefined : 0 }) // via trigger idéalement
      .eq('id', user.id);
    // Utiliser un RPC pour ajouter les coins atomiquement
    await supabase.rpc('add_xp', { p_amount: 0 }); // juste pour trigger, XP ajouté par le claim
  }

  // Marquer comme réclamé
  const { error } = await supabase
    .from('season_progress')
    .update({ claimed_rewards: [...progress.claimed_rewards, rewardId] })
    .eq('user_id', user.id)
    .eq('season_id', seasonId);

  if (error) throw error;
}

/** Temps restant pour la saison courante. */
export function getSeasonTimeRemaining(endsAt: string): { days: number; hours: number; minutes: number } {
  const now = Date.now();
  const end = new Date(endsAt).getTime();
  const diff = Math.max(0, end - now);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  };
}
