'use client';

import { supabase } from '@/utils/supabase/client';
import type { Playlist, PlaylistTrack } from '@/types';

/**
 * Playlists layer — Gestion de playlists musicales personnalisées.
 */

export async function createPlaylist(name: string, isPublic = false): Promise<Playlist> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('user_playlists')
    .insert({ user_id: user.id, name, is_public: isPublic })
    .select()
    .single();
  if (error) throw error;
  return data as Playlist;
}

export async function fetchPlaylists(userId: string): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('user_playlists')
    .select('*, track_count:playlist_tracks(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!data) return [];

  return data.map((p: any) => ({
    ...p,
    track_count: p.track_count?.[0]?.count ?? 0,
  }));
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase.from('user_playlists').delete().eq('id', playlistId);
  if (error) throw error;
}

export async function addTrack(
  playlistId: string,
  track: { title: string; artist?: string; url: string; duration?: number }
): Promise<PlaylistTrack> {
  // Récupérer le dernier position
  const { data: last } = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const nextPos = (last?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('playlist_tracks')
    .insert({ playlist_id: playlistId, ...track, position: nextPos })
    .select()
    .single();
  if (error) throw error;
  return data as PlaylistTrack;
}

export async function removeTrack(trackId: string): Promise<void> {
  const { error } = await supabase.from('playlist_tracks').delete().eq('id', trackId);
  if (error) throw error;
}

export async function fetchTracks(playlistId: string): Promise<PlaylistTrack[]> {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlaylistTrack[];
}

export async function reorderTracks(playlistId: string, trackIds: string[]): Promise<void> {
  const updates = trackIds.map((id, i) => ({ id, position: i }));
  for (const u of updates) {
    await supabase.from('playlist_tracks').update({ position: u.position }).eq('id', u.id);
  }
}

/** Récupère les musiques ambiantes de tous les jeux (pour le mode radio). */
export async function fetchGameMusics(): Promise<{ title: string; url: string; artist: string }[]> {
  const { data } = await supabase
    .from('games')
    .select('title, ambient_music_url')
    .not('ambient_music_url', 'is', null)
    .eq('status', 'published');

  if (!data) return [];
  return data
    .filter((g: any) => g.ambient_music_url)
    .map((g: any) => ({
      title: `${g.title} OST`,
      url: g.ambient_music_url,
      artist: 'Funny Station',
    }));
}
