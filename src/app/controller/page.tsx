'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Gamepad, Wifi, WifiOff, RefreshCw, Smartphone, Play } from 'lucide-react';

function ControllerContent() {
  const searchParams = useSearchParams();
  const lobbyId = searchParams.get('lobbyId') || 'demo-lobby';
  const userId = searchParams.get('userId') || `mobile-${Math.random().toString(36).substring(2, 7)}`;

  const [connected, setConnected] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const channelRef = useRef<any>(null);

  // Initialisation du canal Supabase Realtime / local BroadcastChannel
  useEffect(() => {
    console.log(`[Mobile Controller] Connexion au salon: ${lobbyId} en tant que: ${userId}`);
    
    const channel = supabase.channel(`lobby:${lobbyId}`, {
      config: {
        broadcast: { self: true, ack: true }, // self: true permet le debug local dans le même onglet
        presence: { key: userId }
      }
    });

    channelRef.current = channel;

    // Calcul de la latence (ping/pong)
    channel.on('broadcast', { event: 'ping' }, () => {
      channel.send({
        type: 'broadcast',
        event: 'pong',
        payload: { userId, timestamp: Date.now() }
      });
    });

    channel.on('broadcast', { event: 'latency_update' }, ({ payload }: any) => {
      if (payload.userId === userId) {
        setLatency(payload.latency);
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Vérifier si la console principale est connectée
        const keys = Object.keys(state);
        // Si plus d'un utilisateur est présent dans le salon (la console + nous), nous sommes connectés !
        setConnected(keys.length > 1);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ 
            online_at: new Date().toISOString(),
            type: 'controller',
            userId
          });
          setConnected(true);
        } else {
          setConnected(false);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [lobbyId, userId]);

  // Sons de toucher UI synthesiés (Web Audio API)
  const playTouchSound = (frequency = 600, duration = 0.08) => {
    if (typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Web Audio non disponible:", e);
    }
  };

  // Vibration haptique
  const triggerVibration = (ms = 40) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  // Transmission des actions
  const sendAction = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK' | 'OPTION' | 'TRIANGLE' | 'SQUARE') => {
    triggerVibration(30);
    
    // Déterminer la fréquence selon le bouton
    let freq = 500;
    if (direction === 'CONFIRM') freq = 650;
    else if (direction === 'BACK') freq = 420;
    else if (direction === 'OPTION') freq = 800;
    else if (direction === 'TRIANGLE') freq = 700;
    else if (direction === 'SQUARE') freq = 580;
    playTouchSound(freq);

    setActiveButton(direction);
    setTimeout(() => setActiveButton(prev => prev === direction ? null : prev), 150);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'controller_state',
        payload: { userId, direction }
      });
      console.log(`[Gamepad] Envoi direction: ${direction}`);
    }
  };

  // Support clavier de secours pour test en Split-Screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          sendAction('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          sendAction('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          sendAction('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          sendAction('RIGHT');
          break;
        case 'Enter':
        case ' ':
          sendAction('CONFIRM');
          break;
        case 'Escape':
        case 'Backspace':
          sendAction('BACK');
          break;
        case 'o':
        case 'O':
          sendAction('OPTION');
          break;
        case 'i':
        case 'I':
          sendAction('TRIANGLE');
          break;
        case 'j':
        case 'J':
          sendAction('SQUARE');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [userId]);

  return (
    <div className="fixed inset-0 w-screen h-screen select-none overflow-hidden flex flex-col justify-between text-white p-4"
         style={{
           background: 'radial-gradient(circle at 20% 20%, rgba(0, 114, 206, 0.15) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(107, 33, 168, 0.15) 0%, transparent 45%), #020617'
         }}>
      
      {/* Barre d'État Mobile */}
      <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl glass-panel border border-zinc-800/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-zinc-400" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">
            Funny Portal v1.0
          </span>
        </div>
        
        {/* Salon Info */}
        <div className="text-[9px] text-zinc-500 font-mono tracking-wider max-w-[100px] truncate">
          Canal: {lobbyId}
        </div>

        {/* Status Connexion */}
        <div className="flex items-center gap-2">
          {latency > 0 && (
            <span className="text-[8px] font-mono text-zinc-400">{latency}ms</span>
          )}
          {connected ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
              <Wifi size={12} className="animate-pulse" />
              <span>Connecté</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-bold">
              <WifiOff size={12} className="animate-bounce" />
              <span>En attente...</span>
            </div>
          )}
        </div>
      </div>

      {/* Zone du Gamepad principal */}
      <div className="flex-1 w-full flex items-center justify-between px-2 md:px-12 max-h-[70vh] my-auto relative">
        
        {/* SECTION GAUCHE : D-PAD (Directional Cross) */}
        <div className="relative w-44 h-44 rounded-full flex items-center justify-center bg-zinc-950/40 border border-zinc-800/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
          {/* Support Circulaire Central */}
          <div className="absolute w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 shadow-md z-10 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-zinc-950/90 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-zinc-800 flex items-center justify-center">
              <Gamepad size={14} className="text-zinc-600" />
            </div>
          </div>

          {/* Boutons Directionnels */}
          {/* HAUT */}
          <button
            onPointerDown={() => sendAction('UP')}
            className={`absolute top-2 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
              activeButton === 'UP'
                ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/60'
            } border`}
          >
            <span className={`text-base font-extrabold transition-colors ${activeButton === 'UP' ? 'text-blue-400' : 'text-zinc-400'}`}>▲</span>
          </button>

          {/* BAS */}
          <button
            onPointerDown={() => sendAction('DOWN')}
            className={`absolute bottom-2 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
              activeButton === 'DOWN'
                ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/60'
            } border`}
          >
            <span className={`text-base font-extrabold transition-colors ${activeButton === 'DOWN' ? 'text-blue-400' : 'text-zinc-400'}`}>▼</span>
          </button>

          {/* GAUCHE */}
          <button
            onPointerDown={() => sendAction('LEFT')}
            className={`absolute left-2 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
              activeButton === 'LEFT'
                ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/60'
            } border`}
          >
            <span className={`text-base font-extrabold transition-colors ${activeButton === 'LEFT' ? 'text-blue-400' : 'text-zinc-400'}`}>◀</span>
          </button>

          {/* DROITE */}
          <button
            onPointerDown={() => sendAction('RIGHT')}
            className={`absolute right-2 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
              activeButton === 'RIGHT'
                ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/60'
            } border`}
          >
            <span className={`text-base font-extrabold transition-colors ${activeButton === 'RIGHT' ? 'text-blue-400' : 'text-zinc-400'}`}>▶</span>
          </button>
        </div>

        {/* SECTION CENTRALE : LOGO & OPTIONS */}
        <div className="flex flex-col items-center gap-6 z-10">
          <div className="text-center">
            <span className="text-sm font-extrabold tracking-[0.3em] bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent uppercase drop-shadow-[0_0_8px_rgba(0,114,206,0.3)]">
              Funny Station
            </span>
          </div>

          {/* Bouton Option (Start/Select) */}
          <button
            onPointerDown={() => sendAction('OPTION')}
            className={`px-5 py-2.5 rounded-full flex items-center gap-1.5 border transition-all duration-150 active:scale-95 text-[9px] uppercase tracking-widest font-bold ${
              activeButton === 'OPTION'
                ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                : 'glass-panel border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <RefreshCw size={10} className={activeButton === 'OPTION' ? 'animate-spin' : ''} />
            <span>Options / Menu</span>
          </button>
        </div>

        {/* SECTION DROITE : BOUTONS D'ACTION (Losange Symétrique de 4 boutons) */}
        <div className="relative w-44 h-44 rounded-full flex items-center justify-center bg-zinc-950/40 border border-zinc-800/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
          {/* Support Circulaire Central */}
          <div className="absolute w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 shadow-md z-10 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-zinc-950/90 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-zinc-800 flex items-center justify-center">
              <span className="text-[8px] font-black tracking-widest text-zinc-500 uppercase">Action</span>
            </div>
          </div>

          {/* TRIANGLE (▲) - HAUT */}
          <button
            onPointerDown={() => sendAction('TRIANGLE')}
            className={`absolute top-2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
              activeButton === 'TRIANGLE'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                : 'bg-zinc-900/80 border-emerald-500/30 text-emerald-500/80 hover:bg-zinc-800/60'
            }`}
          >
            <span className="text-base font-bold">▲</span>
          </button>

          {/* CROSS (✕) - BAS - CONFIRM */}
          <button
            onPointerDown={() => sendAction('CONFIRM')}
            className={`absolute bottom-2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
              activeButton === 'CONFIRM'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                : 'bg-zinc-900/80 border-cyan-500/30 text-cyan-500/80 hover:bg-zinc-800/60'
            }`}
          >
            <span className="text-base font-bold">✕</span>
          </button>

          {/* SQUARE (■) - GAUCHE */}
          <button
            onPointerDown={() => sendAction('SQUARE')}
            className={`absolute left-2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
              activeButton === 'SQUARE'
                ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                : 'bg-zinc-900/80 border-purple-500/30 text-purple-500/80 hover:bg-zinc-800/60'
            }`}
          >
            <span className="text-xs font-bold">■</span>
          </button>

          {/* CIRCLE (◯) - DROITE - BACK */}
          <button
            onPointerDown={() => sendAction('BACK')}
            className={`absolute right-2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
              activeButton === 'BACK'
                ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                : 'bg-zinc-900/80 border-rose-500/30 text-rose-500/80 hover:bg-zinc-800/60'
            }`}
          >
            <span className="text-base font-bold">◯</span>
          </button>
        </div>

      </div>

      {/* Guide d'utilisation en bas */}
      <div className="w-full text-center py-2 text-zinc-500 text-[8px] font-mono tracking-wide">
        Toucher les boutons ou utiliser le clavier [ Z / Q / S / D / Flèches / Espace / Entrée / Échap / I (Triangle) / J (Carré) ]
      </div>

    </div>
  );
}

export default function MobileControllerPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
        <span className="text-xs text-zinc-400 uppercase tracking-widest">Initialisation...</span>
      </div>
    }>
      <ControllerContent />
    </Suspense>
  );
}
