'use client';

import { supabase } from '@/utils/supabase/client';
import type { Friendship, FriendWithProfile } from '@/types';

/**
 * Social layer — Gestion des amis et activité en temps réel.
 */

// ── FRIEND REQUESTS ───────────────────────────────────────────

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // Vérifier qu'il n'existe pas déjà une relation (dans les deux sens)
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
    .limit(1);

  if (existing && existing.length > 0) {
    const f = existing[0];
    if (f.status === 'accepted') throw new Error('Déjà amis');
    if (f.status === 'pending') throw new Error('Demande déjà envoyée');
    if (f.status === 'blocked') throw new Error('Utilisateur bloqué');
  }

  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: 'pending',
  });
  if (error) throw error;
}

export async function acceptFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
}

export async function blockUser(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'blocked', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

// ── FRIEND LISTS ──────────────────────────────────────────────

export async function fetchFriends(userId: string): Promise<FriendWithProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      requester_id,
      addressee_id,
      status,
      requester:profiles!friendships_requester_id_fkey(id, username, avatar_url, online_status, current_game_title),
      addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url, online_status, current_game_title)
    `)
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw error;
  if (!data) return [];

  return data.map((f: any) => {
    const isRequester = f.requester_id === userId;
    const friend = isRequester ? f.addressee : f.requester;
    return {
      friendship_id: f.id,
      friend_id: friend.id,
      username: friend.username,
      avatar_url: friend.avatar_url,
      online_status: friend.online_status,
      current_game_title: friend.current_game_title,
    };
  });
}

export async function fetchPendingRequests(userId: string): Promise<FriendWithProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      requester:profiles!friendships_requester_id_fkey(id, username, avatar_url, online_status)
    `)
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((f: any) => ({
    friendship_id: f.id,
    friend_id: f.requester.id,
    username: f.requester.username,
    avatar_url: f.requester.avatar_url,
    online_status: f.requester.online_status,
    current_game_title: null,
  }));
}

export async function fetchOnlineFriends(userId: string): Promise<FriendWithProfile[]> {
  const friends = await fetchFriends(userId);
  return friends.filter(f => f.online_status);
}

export async function searchUsers(query: string, currentUserId: string): Promise<{ id: string; username: string; avatar_url?: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

// ── ACTIVITY ──────────────────────────────────────────────────

export async function setCurrentGame(gameId: string | null, gameTitle: string | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({
      current_game_id: gameId,
      current_game_title: gameTitle,
      online_status: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
}
