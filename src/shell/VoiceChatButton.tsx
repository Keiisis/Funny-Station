'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { VoiceChat } from '@/multiplayer/VoiceChat';

interface VoiceChatButtonProps {
  /** Code de la room (un canal vocal dédié `voice:<roomCode>` est créé). */
  roomCode: string;
  /** Identifiant unique du joueur local. */
  selfId: string;
  /** Ids des membres actuellement dans la room (pour le maillage audio). */
  memberIds: string[];
  className?: string;
}

/**
 * Bouton micro autonome : 1er clic = ACTIVER le micro (chat vocal temps réel WebRTC
 * avec les autres joueurs de la room) ; clics suivants = couper/réactiver (mute).
 * Gère tout le cycle de vie WebRTC + le signaling sur un canal Supabase dédié.
 */
export const VoiceChatButton: React.FC<VoiceChatButtonProps> = ({ roomCode, selfId, memberIds, className }) => {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const voiceRef = useRef<VoiceChat | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Crée le canal vocal dédié + branche le signaling (listeners AVANT subscribe).
  useEffect(() => {
    if (!roomCode || !selfId) return;
    const channel = supabase.channel(`voice:${roomCode}`, { config: { broadcast: { self: false, ack: false } } });
    channelRef.current = channel;

    const voice = new VoiceChat(
      selfId,
      (event, payload) => channel.send({ type: 'broadcast', event, payload }),
      (count) => setPeerCount(count),
    );
    voiceRef.current = voice;

    (['voice_offer', 'voice_answer', 'voice_ice', 'voice_leave'] as const).forEach((ev) => {
      channel.on('broadcast', { event: ev }, ({ payload }: { payload: unknown }) => {
        voice.handleSignal(ev, payload as never);
      });
    });
    channel.subscribe();

    return () => {
      voice.stop();
      voiceRef.current = null;
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomCode, selfId]);

  // Met à jour le maillage quand la liste des membres change (si actif).
  useEffect(() => {
    if (active) voiceRef.current?.syncPeers(memberIds);
  }, [memberIds, active]);

  const handleClick = async () => {
    const voice = voiceRef.current;
    if (!voice) return;
    if (!active) {
      setBusy(true);
      const ok = await voice.start();
      setBusy(false);
      if (!ok) { alert("Micro indisponible : autorise l'accès au micro dans ton navigateur."); return; }
      setActive(true);
      setMuted(false);
      voice.syncPeers(memberIds); // ouvre les connexions tout de suite
    } else {
      const next = !muted;
      voice.setMuted(next);
      setMuted(next);
    }
  };

  const label = !active ? 'Micro' : muted ? 'Coupé' : 'En direct';
  const tone = !active
    ? 'border-zinc-700 bg-zinc-900/60 text-zinc-300'
    : muted
    ? 'border-rose-500/60 bg-rose-500/15 text-rose-300'
    : 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={!active ? 'Activer le chat vocal' : muted ? 'Réactiver le micro' : 'Couper le micro'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${tone} ${className || ''}`}
    >
      {active && !muted ? <Mic size={13} className="animate-pulse" /> : <MicOff size={13} />}
      <span>{label}</span>
      {active && peerCount > 0 && <span className="opacity-70">· {peerCount}</span>}
    </button>
  );
};
