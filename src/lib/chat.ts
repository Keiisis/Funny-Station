'use client';

import { supabase } from '@/utils/supabase/client';
import type { ChatMessage } from '@/types';

/**
 * Chat layer — Messages en jeu, privés, et globaux via Supabase Realtime.
 */

const BANNED_WORDS = ['putain', 'merde', 'connard', 'salope', 'enculé', 'nique', 'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy'];

function filterContent(text: string): string {
  let filtered = text;
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  }
  return filtered;
}

export async function sendMessage(
  channelType: 'room' | 'private' | 'global',
  channelId: string,
  content: string
): Promise<ChatMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const filtered = filterContent(content.trim());
  if (!filtered) throw new Error('Message vide');

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: user.id,
      channel_type: channelType,
      channel_id: channelId,
      content: filtered,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChatMessage;
}

export async function fetchMessages(
  channelType: 'room' | 'private' | 'global',
  channelId: string,
  limit = 100
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      sender:profiles!chat_messages_sender_id_fkey(username, avatar_url)
    `)
    .eq('channel_type', channelType)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return data.map((msg: any) => ({
    ...msg,
    sender_username: msg.sender?.username,
    sender_avatar: msg.sender?.avatar_url,
  }));
}

/**
 * Génère un channel_id déterministe pour les messages privés entre deux utilisateurs.
 * Toujours trié alphabétiquement pour garantir l'unicité.
 */
export function getPrivateChannelId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':');
}

export async function fetchConversations(userId: string): Promise<{ channel_id: string; friend_id: string; friend_username: string; last_message: string; last_at: string }[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      channel_id, content, created_at,
      sender:profiles!chat_messages_sender_id_fkey(id, username)
    `)
    .eq('channel_type', 'private')
    .or(`channel_id.ilike.%${userId}%`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  if (!data) return [];

  // Dédupliquer par channel_id, garder le dernier message
  const convMap = new Map<string, any>();
  for (const msg of data as any[]) {
    if (!convMap.has(msg.channel_id)) {
      const friendId = msg.channel_id.split(':').find((id: string) => id !== userId) || '';
      convMap.set(msg.channel_id, {
        channel_id: msg.channel_id,
        friend_id: friendId,
        friend_username: msg.sender?.id === userId ? '...' : msg.sender?.username || '?',
        last_message: msg.content,
        last_at: msg.created_at,
      });
    }
  }

  return Array.from(convMap.values());
}

/**
 * Souscription Realtime aux nouveaux messages d'un canal.
 */
export function subscribeToChat(
  channelType: string,
  channelId: string,
  onMessage: (msg: ChatMessage) => void
): () => void {
  const uniq = Math.random().toString(36).substring(2, 10);
  const channel = supabase
    .channel(`chat:${channelType}:${channelId}:${uniq}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      },
      async (payload: any) => {
        // Enrichir avec le username du sender
        const msg = payload.new as ChatMessage;
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', msg.sender_id)
          .single();
        if (profile) {
          msg.sender_username = profile.username;
          msg.sender_avatar = profile.avatar_url;
        }
        onMessage(msg);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
