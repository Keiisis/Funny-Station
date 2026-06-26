'use client';

import { supabase } from '@/utils/supabase/client';
import type { Screenshot } from '@/types';

/**
 * Screenshots layer — Capture d'écran, clips vidéo, galerie.
 */

/**
 * Capture le contenu d'un canvas et l'uploade sur Supabase Storage.
 */
export async function captureScreenshot(
  canvas: HTMLCanvasElement,
  gameId: string | null,
  caption?: string
): Promise<Screenshot | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 0.92)
  );
  if (!blob) return null;

  const filename = `screenshots/${user.id}/${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from('game-assets')
    .upload(filename, blob, { contentType: 'image/png', upsert: false });

  if (uploadError) {
    console.error('[Screenshots] Upload failed:', uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage.from('game-assets').getPublicUrl(filename);
  const url = urlData.publicUrl;

  const { data, error } = await supabase
    .from('screenshots')
    .insert({
      user_id: user.id,
      game_id: gameId,
      type: 'screenshot',
      url,
      caption: caption || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[Screenshots] DB insert failed:', error);
    return null;
  }

  return data as Screenshot;
}

/**
 * Démarre l'enregistrement d'un clip vidéo depuis un canvas.
 * Retourne un objet avec stop() pour arrêter et sauvegarder.
 */
export function startClipRecording(
  canvas: HTMLCanvasElement,
  maxDurationMs = 30000
): { stop: () => Promise<Blob | null>; cancel: () => void } {
  const stream = canvas.captureStream(30);
  const chunks: Blob[] = [];
  let recorder: MediaRecorder | null = null;
  let stopped = false;

  try {
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  } catch {
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch {
      return {
        stop: async () => null,
        cancel: () => {},
      };
    }
  }

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(1000); // 1s chunks

  const autoStopTimeout = setTimeout(() => {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  }, maxDurationMs);

  return {
    stop: () =>
      new Promise<Blob | null>((resolve) => {
        if (stopped) { resolve(null); return; }
        stopped = true;
        clearTimeout(autoStopTimeout);
        if (!recorder || recorder.state !== 'recording') {
          resolve(chunks.length > 0 ? new Blob(chunks, { type: 'video/webm' }) : null);
          return;
        }
        recorder.onstop = () => {
          resolve(chunks.length > 0 ? new Blob(chunks, { type: 'video/webm' }) : null);
        };
        recorder.stop();
      }),
    cancel: () => {
      stopped = true;
      clearTimeout(autoStopTimeout);
      if (recorder && recorder.state === 'recording') recorder.stop();
    },
  };
}

/**
 * Sauvegarde un clip vidéo enregistré.
 */
export async function saveClip(
  blob: Blob,
  gameId: string | null,
  caption?: string
): Promise<Screenshot | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const filename = `screenshots/${user.id}/${Date.now()}.webm`;

  const { error: uploadError } = await supabase.storage
    .from('game-assets')
    .upload(filename, blob, { contentType: 'video/webm', upsert: false });

  if (uploadError) return null;

  const { data: urlData } = supabase.storage.from('game-assets').getPublicUrl(filename);

  const { data, error } = await supabase
    .from('screenshots')
    .insert({
      user_id: user.id,
      game_id: gameId,
      type: 'clip',
      url: urlData.publicUrl,
      caption: caption || null,
    })
    .select()
    .single();

  if (error) return null;
  return data as Screenshot;
}

export async function fetchGallery(userId: string, limit = 50): Promise<Screenshot[]> {
  const { data, error } = await supabase
    .from('screenshots')
    .select(`
      *,
      game:games!screenshots_game_id_fkey(title)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return data.map((s: any) => ({
    ...s,
    game_title: s.game?.title,
  }));
}

export async function deleteScreenshot(screenshotId: string): Promise<void> {
  const { error } = await supabase.from('screenshots').delete().eq('id', screenshotId);
  if (error) throw error;
}
