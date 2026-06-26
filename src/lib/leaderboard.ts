'use client';

import { supabase } from '@/utils/supabase/client';
import type { LeaderboardEntry, LeaderboardPeriod } from '@/types';

/**
 * Leaderboard layer — Scores, classements et rangs.
 */

export async function submitScore(
  gameId: string,
  score: number,
  period: LeaderboardPeriod = 'alltime',
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.rpc('submit_score', {
    p_game_id: gameId,
    p_score: score,
    p_period: period,
    p_metadata: metadata,
  });
  if (error) throw error;
}

export async function fetchLeaderboard(
  gameId: string,
  period: LeaderboardPeriod = 'alltime',
  limit = 50
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select(`
      id, user_id, game_id, score, period, metadata, created_at,
      profile:profiles!leaderboard_scores_user_id_fkey(username, avatar_url)
    `)
    .eq('game_id', gameId)
    .eq('period', period)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return data.map((row: any, index: number) => ({
    ...row,
    username: row.profile?.username,
    avatar_url: row.profile?.avatar_url,
    rank: index + 1,
  }));
}

export async function fetchFriendsLeaderboard(
  userId: string,
  gameId: string,
  friendIds: string[]
): Promise<LeaderboardEntry[]> {
  if (friendIds.length === 0) return [];
  const allIds = [userId, ...friendIds];

  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select(`
      id, user_id, game_id, score, period, metadata, created_at,
      profile:profiles!leaderboard_scores_user_id_fkey(username, avatar_url)
    `)
    .eq('game_id', gameId)
    .eq('period', 'alltime')
    .in('user_id', allIds)
    .order('score', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row: any, index: number) => ({
    ...row,
    username: row.profile?.username,
    avatar_url: row.profile?.avatar_url,
    rank: index + 1,
  }));
}

export async function fetchPlayerRank(
  userId: string,
  gameId: string,
  period: LeaderboardPeriod = 'alltime'
): Promise<{ rank: number; score: number } | null> {
  const { data: userScore } = await supabase
    .from('leaderboard_scores')
    .select('score')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .eq('period', period)
    .single();

  if (!userScore) return null;

  const { count } = await supabase
    .from('leaderboard_scores')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('period', period)
    .gt('score', userScore.score);

  return { rank: (count ?? 0) + 1, score: userScore.score };
}

export async function fetchTopGamesLeaderboard(limit = 10): Promise<{ game_id: string; game_title: string; top_score: number; player_count: number }[]> {
  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select('game_id, score, games!leaderboard_scores_game_id_fkey(title)')
    .eq('period', 'alltime')
    .order('score', { ascending: false })
    .limit(limit * 3);

  if (error || !data) return [];

  const gameMap = new Map<string, { game_title: string; top_score: number; player_count: number }>();
  for (const row of data as any[]) {
    const gid = row.game_id;
    if (!gameMap.has(gid)) {
      gameMap.set(gid, { game_title: row.games?.title || '', top_score: row.score, player_count: 1 });
    } else {
      gameMap.get(gid)!.player_count++;
    }
  }

  return Array.from(gameMap.entries())
    .map(([game_id, v]) => ({ game_id, ...v }))
    .sort((a, b) => b.top_score - a.top_score)
    .slice(0, limit);
}
