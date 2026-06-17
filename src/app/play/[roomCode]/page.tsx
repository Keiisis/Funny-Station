'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { GameRoom } from '@/multiplayer/GameRoom';
import { GameStateSync } from '@/multiplayer/GameStateSync';
import { UniversalRuntimeRunner } from '@/kernel/UniversalRuntimeRunner';
import type { OnlinePlayer } from '@/types';
import { Users, Wifi, WifiOff, Copy, Check, ArrowLeft, Gamepad, Smartphone, X } from 'lucide-react';
import QRCode from 'qrcode';

const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', dot: 'bg-amber-400' },
];

function PlayContent() {
  const params = useParams();
  const roomCode = (params?.roomCode as string)?.toUpperCase() || '';

  const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'error' | 'closed'>('connecting');
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [localPlayerNumber, setLocalPlayerNumber] = useState(0);
  const localPlayerNumberRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [gameId, setGameId] = useState('g1'); // Default to Neon Runner
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  // Stable guest ID — persists across re-renders and joinGame calls
  const guestIdRef = useRef<string>(`guest-${Math.random().toString(36).substring(2, 11)}`);
  const guestId = guestIdRef.current;

  // Mobile controller state for guest
  const [showControllerModal, setShowControllerModal] = useState(false);
  const [guestQrCodeUrl, setGuestQrCodeUrl] = useState<string>('');

  const roomRef = useRef<GameRoom | null>(null);
  const syncRef = useRef<GameStateSync | null>(null);
  const controllerChannelRef = useRef<any>(null);

  // Auto-generate guest username
  useEffect(() => {
    const guestName = `Joueur-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setUsername(guestName);
  }, []);

  // Generate QR Code for guest mobile controller
  useEffect(() => {
    if (!roomCode || typeof window === 'undefined') return;
    const controllerUrl = `${window.location.origin}/controller?lobbyId=${roomCode}&clientPlayerId=${guestId}`;
    QRCode.toDataURL(controllerUrl, {
      width: 256,
      margin: 1,
      color: { dark: '#020617', light: '#ffffff' }
    })
      .then(url => setGuestQrCodeUrl(url))
      .catch(err => console.error('Erreur génération QR Code invité:', err));
  }, [roomCode, guestId]);

  // Subscribe to Supabase channel for guest controller inputs
  useEffect(() => {
    if (!hasJoined || !roomCode) return;

    const channel = supabase.channel(`lobby:${roomCode}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: `guest-console-${guestId}` }
      }
    });

    controllerChannelRef.current = channel;

    channel.on('broadcast', { event: 'controller_state' }, ({ payload }: any) => {
      const { direction, action, clientPlayerId } = payload;
      // Only process inputs from this guest's own mobile controller
      if (clientPlayerId !== guestId) return;

      const effectiveAction = action || 'down';

      // Relay the input to the host via GameStateSync (use ref for stable value)
      if (syncRef.current) {
        syncRef.current.sendInput(direction, localPlayerNumberRef.current, '', effectiveAction);
      }
    });

    channel
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString(), type: 'guest-console' });
        }
      });

    return () => {
      channel.unsubscribe();
      controllerChannelRef.current = null;
    };
  }, [hasJoined, roomCode, guestId]);

  const joinGame = async () => {
    if (!roomCode || !username.trim()) return;

    setStatus('connecting');
    setHasJoined(true);

    const room = GameRoom.joinRoom(roomCode, {
      id: guestId,
      username: username.trim()
    });

    roomRef.current = room;

    // Listen for events
    room.onEvent((event) => {
      if (event.type === 'game_start') {
        setGameId(event.gameId);
        setStatus('playing');
      }
      if (event.type === 'room_closed') {
        setStatus('closed');
      }
    });

    room.onPlayersChanged((updatedPlayers) => {
      setPlayers(updatedPlayers);
      const me = updatedPlayers.find(p => p.userId === guestId);
      if (me) {
        setLocalPlayerNumber(me.playerNumber);
        localPlayerNumberRef.current = me.playerNumber;
      }
    });

    const connected = await room.connect();
    if (connected) {
      // Create GameStateSync as client
      const channel = room.getChannel();
      if (channel) {
        syncRef.current = new GameStateSync(channel, false);
      }
      setStatus('waiting');
    } else {
      setStatus('error');
      setErrorMsg('Impossible de rejoindre la room. Vérifiez le code.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      syncRef.current?.destroy();
      roomRef.current?.disconnect();
    };
  }, []);

  const copyLink = () => {
    const url = `${window.location.origin}/play/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playerColor = PLAYER_COLORS[localPlayerNumber] || PLAYER_COLORS[0];

  // === JOIN SCREEN ===
  if (!hasJoined) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center"
           style={{ background: 'radial-gradient(circle at 30% 30%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(168,85,247,0.08) 0%, transparent 50%), #09090b' }}>
        <div className="flex flex-col items-center gap-6 max-w-sm w-full px-6">
          <div className="flex items-center gap-3 mb-2">
            <Gamepad size={28} className="text-blue-400" />
            <h1 className="text-2xl font-black tracking-wider text-white uppercase">Funny Station</h1>
          </div>

          <div className="w-full p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex flex-col gap-4">
            <div className="text-center">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Rejoindre la partie</div>
              <div className="text-2xl font-mono font-black text-blue-400 tracking-[0.3em]">{roomCode}</div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Votre pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={16}
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-bold tracking-wide focus:border-blue-500/50 focus:outline-none transition-colors"
                placeholder="Entrez votre pseudo..."
              />
            </div>

            <button
              onClick={joinGame}
              disabled={!username.trim()}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-wider text-sm transition-all cursor-pointer"
            >
              Rejoindre
            </button>
          </div>

          <p className="text-[10px] text-zinc-600 text-center">
            Aucun compte requis. Entrez un pseudo et rejoignez instantanément.
          </p>
        </div>
      </div>
    );
  }

  // === CONNECTING / WAITING SCREEN ===
  if (status === 'connecting' || status === 'waiting') {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center"
           style={{ background: 'radial-gradient(circle at 30% 30%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(168,85,247,0.08) 0%, transparent 50%), #09090b' }}>
        <div className="flex flex-col items-center gap-6 max-w-md w-full px-6">
          <div className="flex items-center gap-3">
            <Gamepad size={28} className="text-blue-400" />
            <h1 className="text-2xl font-black tracking-wider text-white uppercase">Funny Station</h1>
          </div>

          {/* Room Code */}
          <div className="w-full p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex flex-col items-center gap-3">
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Room</div>
            <div className="text-3xl font-mono font-black text-blue-400 tracking-[0.3em]">{roomCode}</div>

            {status === 'connecting' ? (
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold animate-pulse">
                <WifiOff size={14} />
                <span>Connexion en cours...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Wifi size={14} className="animate-pulse" />
                <span>Connecté — En attente du lancement</span>
              </div>
            )}
          </div>

          {/* Connected players */}
          <div className="w-full p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Users size={12} /> Joueurs
              </span>
              <span className="text-[10px] font-mono text-zinc-400">{players.length}/4</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {players.map((player) => {
                const c = PLAYER_COLORS[player.playerNumber] || PLAYER_COLORS[0];
                return (
                  <div key={player.userId} className={`flex items-center gap-2 p-2.5 rounded-xl border ${c.border} ${c.bg}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot} animate-pulse`} />
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-bold ${c.text} uppercase tracking-wide`}>
                        {player.username} {player.isHost ? '👑' : ''}
                      </span>
                      <span className="text-[8px] text-zinc-500">P{player.playerNumber + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {players.length === 0 && (
              <div className="text-center text-xs text-zinc-600 py-3 animate-pulse">
                Recherche des joueurs...
              </div>
            )}
          </div>

          {/* Mobile Controller Button */}
          <button
            onClick={() => setShowControllerModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 hover:border-emerald-500/50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Smartphone size={14} />
            Manette Portable
          </button>

          {/* Share link */}
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 text-xs transition-all cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Lien copié !' : 'Copier le lien d\'invitation'}
          </button>

          <p className="text-[10px] text-zinc-600 text-center">
            L&apos;hôte lancera la partie quand tout le monde sera prêt.
          </p>
        </div>

        {/* Mobile Controller Modal */}
        {showControllerModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
            <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-zinc-800/80 flex flex-col items-center gap-4 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              <div className="w-full flex items-center justify-between">
                <h3 className="text-sm font-black tracking-wider text-zinc-100 uppercase">Manette Portable</h3>
                <button
                  onClick={() => setShowControllerModal(false)}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">
                Scannez ce QR Code avec votre téléphone pour l&apos;utiliser comme manette tactile.
              </p>
              <div className="p-3 bg-white rounded-2xl w-40 h-40 shadow-lg flex items-center justify-center">
                {guestQrCodeUrl ? (
                  <img src={guestQrCodeUrl} alt="QR Manette Invité" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-900 text-xs">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-900" />
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowControllerModal(false)}
                className="w-full py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === ERROR / CLOSED SCREEN ===
  if (status === 'error' || status === 'closed') {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="text-4xl">😔</div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">
            {status === 'closed' ? 'Partie terminée' : 'Erreur de connexion'}
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            {status === 'closed'
              ? "L'hôte a fermé la room. La partie est terminée."
              : errorMsg || 'Impossible de rejoindre la partie.'}
          </p>
          <a
            href="/"
            className="mt-4 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-sm transition-all"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    );
  }

  // === PLAYING SCREEN ===
  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Mini status bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${playerColor.bg} ${playerColor.border} border`}>
            <div className={`w-2 h-2 rounded-full ${playerColor.dot}`} />
            <span className={`text-[10px] font-black uppercase tracking-wider ${playerColor.text}`}>
              P{localPlayerNumber + 1} — {username}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <Wifi size={10} /> EN LIGNE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowControllerModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Smartphone size={10} />
            Manette
          </button>
          <span className="text-[9px] text-zinc-500 font-mono">{roomCode}</span>
          <span className="text-[9px] text-zinc-600">{players.length} joueurs</span>
        </div>
      </div>

      {/* Game */}
      <div className="flex-1 pt-10">
        <UniversalRuntimeRunner
          gameId={gameId}
          gameUrl="/games/neon-runner"
          entryPoint="index.js"
          language="js"
          manifest={{ screen_ratio: '16/9' }}
          networkMode="client"
          gameStateSync={syncRef.current}
          localPlayerNumber={localPlayerNumber}
        />
      </div>

      {/* Mobile Controller Modal (in-game) */}
      {showControllerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-zinc-800/80 flex flex-col items-center gap-4 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="w-full flex items-center justify-between">
              <h3 className="text-sm font-black tracking-wider text-zinc-100 uppercase">Manette Portable</h3>
              <button
                onClick={() => setShowControllerModal(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              Scannez ce QR Code avec votre téléphone pour l&apos;utiliser comme manette tactile.
            </p>
            <div className="p-3 bg-white rounded-2xl w-40 h-40 shadow-lg flex items-center justify-center">
              {guestQrCodeUrl ? (
                <img src={guestQrCodeUrl} alt="QR Manette Invité" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-900 text-xs">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-900" />
                </div>
              )}
            </div>
            <button
              onClick={() => setShowControllerModal(false)}
              className="w-full py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="text-blue-400 font-bold tracking-widest animate-pulse">FUNNY STATION</div>
      </div>
    }>
      <PlayContent />
    </Suspense>
  );
}

