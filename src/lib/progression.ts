'use client';

import { supabase } from '@/utils/supabase/client';
import type { DailyRewardStatus, PlayerLevel } from '@/types';

/**
 * Progression layer — Daily Rewards, XP, Niveaux.
 */

// ── DAILY REWARDS ─────────────────────────────────────────────

export async function claimDailyReward(): Promise<DailyRewardStatus> {
  const { data, error } = await supabase.rpc('claim_daily_reward');
  if (error) throw error;
  return data as DailyRewardStatus;
}

export async function fetchDailyStatus(userId: string): Promise<{ streak: number; last_claim: string | null; total_claims: number; can_claim: boolean }> {
  const { data } = await supabase
    .from('daily_rewards')
    .select('streak, last_claim, total_claims')
    .eq('user_id', userId)
    .single();

  if (!data) return { streak: 0, last_claim: null, total_claims: 0, can_claim: true };

  const today = new Date().toISOString().split('T')[0];
  const canClaim = data.last_claim !== today;

  return {
    streak: data.streak,
    last_claim: data.last_claim,
    total_claims: data.total_claims,
    can_claim: canClaim,
  };
}

/** Calcul du montant de la récompense pour un streak donné (miroir de la logique SQL). */
export function calculateReward(streak: number): number {
  const baseReward = 50;
  const streakBonus = 10;
  const maxBonus = 200;
  return baseReward + Math.min(streak * streakBonus, maxBonus);
}

/** Récompenses par jour pour l'affichage du calendrier (7 jours). */
export function getWeeklyRewards(): { day: number; coins: number; bonus: string }[] {
  return [
    { day: 1, coins: 60, bonus: '' },
    { day: 2, coins: 70, bonus: '' },
    { day: 3, coins: 80, bonus: '🔥' },
    { day: 4, coins: 90, bonus: '' },
    { day: 5, coins: 100, bonus: '⭐' },
    { day: 6, coins: 110, bonus: '' },
    { day: 7, coins: 250, bonus: '🎰 JACKPOT' },
  ];
}

// ── XP / LEVELS ───────────────────────────────────────────────

export async function addXP(amount: number): Promise<{ xp: number; level: number; title: string; leveled_up: boolean }> {
  const { data, error } = await supabase.rpc('add_xp', { p_amount: amount });
  if (error) throw error;
  return data as { xp: number; level: number; title: string; leveled_up: boolean };
}

export async function fetchPlayerLevel(userId: string): Promise<PlayerLevel | null> {
  const { data } = await supabase
    .from('player_levels')
    .select('*')
    .eq('user_id', userId)
    .single();
  return (data as PlayerLevel) ?? null;
}

/** XP nécessaire pour le prochain niveau. */
export function xpForLevel(level: number): number {
  return level * 500;
}

/** Pourcentage de progression vers le prochain niveau. */
export function xpProgress(xp: number, level: number): number {
  const currentLevelXp = (level - 1) * 500;
  const nextLevelXp = level * 500;
  const progress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
  return Math.max(0, Math.min(1, progress));
}

/** Titres associés aux niveaux (miroir de la logique SQL). */
export const LEVEL_TITLES: { minLevel: number; title: string; color: string }[] = [
  { minLevel: 50, title: 'Légende', color: '#fbbf24' },
  { minLevel: 40, title: 'Maître', color: '#f97316' },
  { minLevel: 30, title: 'Expert', color: '#a855f7' },
  { minLevel: 20, title: 'Vétéran', color: '#6366f1' },
  { minLevel: 15, title: 'Champion', color: '#ec4899' },
  { minLevel: 10, title: 'Pro Gamer', color: '#3b82f6' },
  { minLevel: 5, title: 'Joueur', color: '#10b981' },
  { minLevel: 1, title: 'Rookie', color: '#64748b' },
];

export function getTitleForLevel(level: number): { title: string; color: string } {
  for (const t of LEVEL_TITLES) {
    if (level >= t.minLevel) return t;
  }
  return LEVEL_TITLES[LEVEL_TITLES.length - 1];
}
