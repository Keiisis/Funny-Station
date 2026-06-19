'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Gamepad, Wifi, WifiOff, RefreshCw, Smartphone, Play, User } from 'lucide-react';

// Couleurs correspondant aux assignations du Dashboard
const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40', label: 'Joueur 1' },
  { text: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', label: 'Joueur 2' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', label: 'Joueur 3' },
  { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', label: 'Joueur 4' },
];

interface VirtualJoystickProps {
  side: 'LEFT' | 'RIGHT';
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ side, onMove, onEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    setActive(true);
    updatePosition(e);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!active) return;
    updatePosition(e);
  };

  const handleEnd = () => {
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onEnd();
  };

  const updatePosition = (e: React.TouchEvent | React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2 - 12;

    let targetX = dx;
    let targetY = dy;

    if (distance > maxRadius) {
      targetX = (dx / distance) * maxRadius;
      targetY = (dy / distance) * maxRadius;
    }

    setKnobPos({ x: targetX, y: targetY });

    const normX = targetX / maxRadius;
    const normY = targetY / maxRadius;
    onMove(normX, normY);
  };

  useEffect(() => {
    if (!active) return;
    const handleGlobalEnd = () => {
      handleEnd();
    };
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      className="w-20 h-20 rounded-full bg-zinc-950/60 border border-zinc-800/80 shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] flex items-center justify-center relative touch-none select-none"
    >
      <div className={`absolute inset-0 rounded-full border border-blue-500/10 transition-opacity duration-300 ${active ? 'opacity-100 border-blue-500/30' : 'opacity-0'}`} />
      <div
        className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-650 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center absolute transition-all duration-75"
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-zinc-800'} transition-all`} />
      </div>
    </div>
  );
};

function ControllerContent() {
  const searchParams = useSearchParams();
  const lobbyId = searchParams.get('lobbyId') || 'demo-lobby';
  // Chaque téléphone génère un ID unique stable (pas de userId dans l'URL pour le multi)
  const userIdRef = useRef(
    searchParams.get('userId') || `mobile-${Math.random().toString(36).substring(2, 9)}`
  );
  const userId = userIdRef.current;

  const [connected, setConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const channelRef = useRef<any>(null);

  // Force landscape orientation via Screen Orientation API
  useEffect(() => {
    const lockLandscape = async () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape');
        }
      } catch (e) {
        console.warn('[Controller] Impossible de verrouiller l\'orientation:', e);
      }
    };
    lockLandscape();

    return () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch (e) {
        // Silently ignore
      }
    };
  }, []);

  // Initialisation du canal Supabase Realtime
  useEffect(() => {
    console.log(`[Mobile Controller] Connexion au salon: ${lobbyId} en tant que: ${userId}`);
    
    const channel = supabase.channel(`lobby:${lobbyId}`, {
      config: {
        broadcast: { self: true, ack: true },
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

    // Écouter les assignations de joueur envoyées par la console
    channel.on('broadcast', { event: 'player_assignment' }, ({ payload }: any) => {
      if (payload.userId === userId) {
        setPlayerNumber(payload.playerNumber);
        setTotalPlayers(payload.totalPlayers);
        console.log(`[Controller] Assigné comme Joueur ${payload.playerNumber + 1} sur ${payload.totalPlayers}`);
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const keys = Object.keys(state);
        // Si au moins un autre utilisateur (la console) est présent
        const hasConsole = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.type === 'console')
        );
        setConnected(hasConsole || keys.length > 1);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ 
            online_at: new Date().toISOString(),
            type: 'controller',
            userId
          });
          setSubscribed(true);
          // Mark as connected as soon as we successfully subscribe
          // (presence sync will refine this state later)
          setConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setSubscribed(false);
          setConnected(false);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [lobbyId, userId]);

  // Sons de toucher UI synthesiés (Web Audio API)
  const playTouchSound = useCallback((frequency = 600, duration = 0.08) => {
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
  }, []);

  // Vibration haptique
  const triggerVibration = useCallback((ms = 40) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }, []);

  // Transmission des actions
  const sendAction = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK' | 'OPTION' | 'TRIANGLE' | 'SQUARE' | 'SELECT' | 'START' | 'L' | 'R', action: 'down' | 'up') => {
    if (action === 'down') {
      triggerVibration(25);
      
      // Déterminer la fréquence selon le bouton
      let freq = 500;
      if (direction === 'CONFIRM') freq = 650;
      else if (direction === 'BACK') freq = 420;
      else if (direction === 'SELECT') freq = 460;
      else if (direction === 'START') freq = 520;
      else if (direction === 'L') freq = 600;
      else if (direction === 'R') freq = 600;
      else if (direction === 'OPTION') freq = 800;
      else if (direction === 'TRIANGLE') freq = 700;
      else if (direction === 'SQUARE') freq = 580;
      playTouchSound(freq);

      setActiveButton(direction);
    } else {
      setActiveButton(prev => prev === direction ? null : prev);
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'controller_state',
        payload: { 
          userId, 
          direction, 
          action, 
          playerNumber: playerNumber !== null ? playerNumber : undefined,
          clientPlayerId: searchParams.get('clientPlayerId') || ''
        }
      });
      console.log(`[Gamepad] Envoi direction: ${direction}, action: ${action}`);
    }
  }, [userId, playerNumber, searchParams, triggerVibration, playTouchSound]);

  const prevLeftAxes = useRef({ UP: false, DOWN: false, LEFT: false, RIGHT: false });
  const prevRightAxes = useRef({ TRIANGLE: false, CONFIRM: false, SQUARE: false, BACK: false });

  const handleLeftJoystickMove = useCallback((x: number, y: number) => {
    const threshold = 0.35;
    const nextStates = {
      UP: y < -threshold,
      DOWN: y > threshold,
      LEFT: x < -threshold,
      RIGHT: x > threshold
    };

    (Object.keys(nextStates) as Array<keyof typeof nextStates>).forEach(dir => {
      const isPressed = nextStates[dir];
      const wasPressed = prevLeftAxes.current[dir];
      if (isPressed !== wasPressed) {
        prevLeftAxes.current[dir] = isPressed;
        sendAction(dir, isPressed ? 'down' : 'up');
      }
    });
  }, [sendAction]);

  const handleLeftJoystickEnd = useCallback(() => {
    (Object.keys(prevLeftAxes.current) as Array<keyof typeof prevLeftAxes.current>).forEach(dir => {
      if (prevLeftAxes.current[dir]) {
        prevLeftAxes.current[dir] = false;
        sendAction(dir, 'up');
      }
    });
  }, [sendAction]);

  const handleRightJoystickMove = useCallback((x: number, y: number) => {
    const threshold = 0.35;
    const nextStates = {
      TRIANGLE: y < -threshold,
      CONFIRM: y > threshold,
      SQUARE: x < -threshold,
      BACK: x > threshold
    };

    (Object.keys(nextStates) as Array<keyof typeof nextStates>).forEach(dir => {
      const isPressed = nextStates[dir];
      const wasPressed = prevRightAxes.current[dir];
      if (isPressed !== wasPressed) {
        prevRightAxes.current[dir] = isPressed;
        sendAction(dir, isPressed ? 'down' : 'up');
      }
    });
  }, [sendAction]);

  const handleRightJoystickEnd = useCallback(() => {
    (Object.keys(prevRightAxes.current) as Array<keyof typeof prevRightAxes.current>).forEach(dir => {
      if (prevRightAxes.current[dir]) {
        prevRightAxes.current[dir] = false;
        sendAction(dir, 'up');
      }
    });
  }, [sendAction]);

  // Support clavier de secours pour test en Split-Screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Éviter la répétition automatique du clavier
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          sendAction('UP', 'down');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          sendAction('DOWN', 'down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          sendAction('LEFT', 'down');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          sendAction('RIGHT', 'down');
          break;
        case 'Enter':
        case ' ':
          sendAction('CONFIRM', 'down');
          break;
        case 'Escape':
        case 'Backspace':
          sendAction('BACK', 'down');
          break;
        case 'o':
        case 'O':
          sendAction('OPTION', 'down');
          break;
        case 'Enter':
          sendAction('START', 'down');
          break;
        case 'Shift':
        case 'Tab':
          sendAction('SELECT', 'down');
          break;
        case 'l':
        case 'L':
          sendAction('L', 'down');
          break;
        case 'r':
        case 'R':
          sendAction('R', 'down');
          break;
        case 'i':
        case 'I':
          sendAction('TRIANGLE', 'down');
          break;
        case 'j':
        case 'J':
          sendAction('SQUARE', 'down');
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          sendAction('UP', 'up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          sendAction('DOWN', 'up');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          sendAction('LEFT', 'up');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          sendAction('RIGHT', 'up');
          break;
        case 'Enter':
        case ' ':
          sendAction('CONFIRM', 'up');
          break;
        case 'Escape':
        case 'Backspace':
          sendAction('BACK', 'up');
          break;
        case 'o':
        case 'O':
          sendAction('OPTION', 'up');
          break;
        case 'Enter':
          sendAction('START', 'up');
          break;
        case 'Shift':
        case 'Tab':
          sendAction('SELECT', 'up');
          break;
        case 'l':
        case 'L':
          sendAction('L', 'up');
          break;
        case 'r':
        case 'R':
          sendAction('R', 'up');
          break;
        case 'i':
        case 'I':
          sendAction('TRIANGLE', 'up');
          break;
        case 'j':
        case 'J':
          sendAction('SQUARE', 'up');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [sendAction]);

  // Determine display status
  const isConnected = connected || subscribed;
  const playerColor = playerNumber !== null ? PLAYER_COLORS[playerNumber] : null;

  return (
    <div className="controller-landscape fixed inset-0 w-screen h-screen select-none overflow-hidden flex flex-col justify-between text-white p-4"
         style={{
           background: 'radial-gradient(circle at 20% 20%, rgba(0, 114, 206, 0.15) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(107, 33, 168, 0.15) 0%, transparent 45%), #020617'
         }}>
      
      {/* Barre d'État Mobile */}
      <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl glass-panel border border-zinc-800/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {playerColor ? (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${playerColor.bg} ${playerColor.border} border`}>
              <User size={12} className={playerColor.text} />
              <span className={`text-[10px] uppercase tracking-widest font-black ${playerColor.text}`}>
                {playerColor.label}
              </span>
            </div>
          ) : (
            <>
              <Smartphone size={16} className="text-zinc-400" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">
                Funny Portal v1.0
              </span>
            </>
          )}
        </div>
        
        {/* Salon Info + nombre de joueurs */}
        <div className="flex items-center gap-3">
          {totalPlayers > 0 && (
            <span className="text-[9px] text-zinc-400 font-mono">
              {totalPlayers} joueur{totalPlayers > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[9px] text-zinc-500 font-mono tracking-wider max-w-[80px] truncate">
            {lobbyId}
          </span>
        </div>

        {/* Status Connexion */}
        <div className="flex items-center gap-2">
          {latency > 0 && (
            <span className="text-[8px] font-mono text-zinc-400">{latency}ms</span>
          )}
          {isConnected ? (
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

      {/* SECTION BOUTONS L & R (Gâchettes Épaules) */}
      <div className="w-full flex justify-between px-6 pt-1">
        {/* BOUTON GAUCHE L */}
        <button
          onPointerDown={() => sendAction('L', 'down')}
          onPointerUp={() => sendAction('L', 'up')}
          onPointerLeave={() => sendAction('L', 'up')}
          onPointerCancel={() => sendAction('L', 'up')}
          className={`w-28 py-3 rounded-b-2xl border-x border-b transition-all duration-150 active:scale-95 text-xs font-black uppercase tracking-widest text-center cursor-pointer ${
            activeButton === 'L'
              ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-[0_4px_10px_rgba(59,130,246,0.3)]'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          L
        </button>

        {/* BOUTON DROIT R */}
        <button
          onPointerDown={() => sendAction('R', 'down')}
          onPointerUp={() => sendAction('R', 'up')}
          onPointerLeave={() => sendAction('R', 'up')}
          onPointerCancel={() => sendAction('R', 'up')}
          className={`w-28 py-3 rounded-b-2xl border-x border-b transition-all duration-150 active:scale-95 text-xs font-black uppercase tracking-widest text-center cursor-pointer ${
            activeButton === 'R'
              ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_4px_10px_rgba(244,63,94,0.3)]'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          R
        </button>
      </div>

      {/* Zone du Gamepad principal */}
      <div className="flex-1 w-full flex items-center justify-between px-2 md:px-12 max-h-[70vh] my-auto relative">
        
        {/* SECTION GAUCHE : D-PAD + JOYSTICK GAUCHE */}
        <div className="flex flex-col items-center gap-3 select-none">
          <div className="relative w-40 h-40 rounded-full flex items-center justify-center bg-zinc-950/40 border border-zinc-800/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
            {/* Support Circulaire Central */}
            <div className="absolute w-18 h-18 rounded-full bg-zinc-900 border border-zinc-800 shadow-md z-10 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-zinc-950/90 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-zinc-800 flex items-center justify-center">
                <Gamepad size={12} className="text-zinc-600" />
              </div>
            </div>

            {/* Boutons Directionnels */}
            {/* HAUT */}
            <button
              onPointerDown={() => sendAction('UP', 'down')}
              onPointerUp={() => sendAction('UP', 'up')}
              onPointerLeave={() => sendAction('UP', 'up')}
              onPointerCancel={() => sendAction('UP', 'up')}
              className={`absolute top-2 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
                activeButton === 'UP'
                  ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/60'
              } border`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'UP' ? 'text-blue-400' : 'text-zinc-400'}`}>▲</span>
            </button>

            {/* BAS */}
            <button
              onPointerDown={() => sendAction('DOWN', 'down')}
              onPointerUp={() => sendAction('DOWN', 'up')}
              onPointerLeave={() => sendAction('DOWN', 'up')}
              onPointerCancel={() => sendAction('DOWN', 'up')}
              className={`absolute bottom-2 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
                activeButton === 'DOWN'
                  ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/60'
              } border`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'DOWN' ? 'text-blue-400' : 'text-zinc-400'}`}>▼</span>
            </button>

            {/* GAUCHE */}
            <button
              onPointerDown={() => sendAction('LEFT', 'down')}
              onPointerUp={() => sendAction('LEFT', 'up')}
              onPointerLeave={() => sendAction('LEFT', 'up')}
              onPointerCancel={() => sendAction('LEFT', 'up')}
              className={`absolute left-2 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
                activeButton === 'LEFT'
                  ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/60'
              } border`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'LEFT' ? 'text-blue-400' : 'text-zinc-400'}`}>◀</span>
            </button>

            {/* DROITE */}
            <button
              onPointerDown={() => sendAction('RIGHT', 'down')}
              onPointerUp={() => sendAction('RIGHT', 'up')}
              onPointerLeave={() => sendAction('RIGHT', 'up')}
              onPointerCancel={() => sendAction('RIGHT', 'up')}
              className={`absolute right-2 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
                activeButton === 'RIGHT'
                  ? 'bg-blue-500/20 border-blue-450 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-805/60'
              } border`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'RIGHT' ? 'text-blue-400' : 'text-zinc-400'}`}>▶</span>
            </button>
          </div>
          
          <VirtualJoystick side="LEFT" onMove={handleLeftJoystickMove} onEnd={handleLeftJoystickEnd} />
        </div>

        {/* SECTION CENTRALE : LOGO & OPTIONS */}
        <div className="flex flex-col items-center gap-6 z-10">
          <div className="text-center">
            <span className="text-sm font-extrabold tracking-[0.3em] bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent uppercase drop-shadow-[0_0_8px_rgba(0,114,206,0.3)]">
              Funny Station
            </span>
          </div>

          {/* Boutons Select, Start et Options */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-3">
              {/* SELECT */}
              <button
                onPointerDown={() => sendAction('SELECT', 'down')}
                onPointerUp={() => sendAction('SELECT', 'up')}
                onPointerLeave={() => sendAction('SELECT', 'up')}
                onPointerCancel={() => sendAction('SELECT', 'up')}
                className={`px-4 py-2 rounded-full border transition-all duration-150 active:scale-95 text-[9px] uppercase tracking-widest font-black cursor-pointer ${
                  activeButton === 'SELECT'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'glass-panel border-zinc-800/80 text-zinc-400 hover:text-white'
                }`}
              >
                <span>Select</span>
              </button>

              {/* START */}
              <button
                onPointerDown={() => sendAction('START', 'down')}
                onPointerUp={() => sendAction('START', 'up')}
                onPointerLeave={() => sendAction('START', 'up')}
                onPointerCancel={() => sendAction('START', 'up')}
                className={`px-4 py-2 rounded-full border transition-all duration-150 active:scale-95 text-[9px] uppercase tracking-widest font-black cursor-pointer ${
                  activeButton === 'START'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'glass-panel border-zinc-800/80 text-zinc-400 hover:text-white'
                }`}
              >
                <span>Start</span>
              </button>
            </div>

            <button
              onPointerDown={() => sendAction('OPTION', 'down')}
              onPointerUp={() => sendAction('OPTION', 'up')}
              onPointerLeave={() => sendAction('OPTION', 'up')}
              onPointerCancel={() => sendAction('OPTION', 'up')}
              className={`px-4 py-2 rounded-full flex items-center gap-1.5 border transition-all duration-150 active:scale-95 text-[8px] uppercase tracking-widest font-bold cursor-pointer ${
                activeButton === 'OPTION'
                  ? 'bg-zinc-800 border-zinc-650 text-zinc-200'
                  : 'bg-zinc-950/20 border-zinc-900 text-zinc-550'
              }`}
            >
              <RefreshCw size={8} className={activeButton === 'OPTION' ? 'animate-spin' : ''} />
              <span>Options / Menu</span>
            </button>
          </div>
        </div>

        {/* SECTION DROITE : BOUTONS D'ACTION + JOYSTICK DROIT */}
        <div className="flex flex-col items-center gap-3 select-none">
          <div className="relative w-40 h-40 rounded-full flex items-center justify-center bg-zinc-950/40 border border-zinc-800/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
            {/* Support Circulaire Central */}
            <div className="absolute w-18 h-18 rounded-full bg-zinc-900 border border-zinc-800 shadow-md z-10 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-zinc-950/90 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-zinc-800 flex items-center justify-center">
                <span className="text-[7px] font-black tracking-widest text-zinc-500 uppercase">Action</span>
              </div>
            </div>

            {/* TRIANGLE (▲) - HAUT */}
            <button
              onPointerDown={() => sendAction('TRIANGLE', 'down')}
              onPointerUp={() => sendAction('TRIANGLE', 'up')}
              onPointerLeave={() => sendAction('TRIANGLE', 'up')}
              onPointerCancel={() => sendAction('TRIANGLE', 'up')}
              className={`absolute top-2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
                activeButton === 'TRIANGLE'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                  : 'bg-zinc-900/80 border-emerald-500/30 text-emerald-500/80 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-sm font-bold">▲</span>
            </button>

            {/* CROSS (✕) - BAS - CONFIRM */}
            <button
              onPointerDown={() => sendAction('CONFIRM', 'down')}
              onPointerUp={() => sendAction('CONFIRM', 'up')}
              onPointerLeave={() => sendAction('CONFIRM', 'up')}
              onPointerCancel={() => sendAction('CONFIRM', 'up')}
              className={`absolute bottom-2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
                activeButton === 'CONFIRM'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                  : 'bg-zinc-900/80 border-cyan-500/30 text-cyan-500/80 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-sm font-bold">✕</span>
            </button>

            {/* SQUARE (■) - GAUCHE */}
            <button
              onPointerDown={() => sendAction('SQUARE', 'down')}
              onPointerUp={() => sendAction('SQUARE', 'up')}
              onPointerLeave={() => sendAction('SQUARE', 'up')}
              onPointerCancel={() => sendAction('SQUARE', 'up')}
              className={`absolute left-2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
                activeButton === 'SQUARE'
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                  : 'bg-zinc-900/80 border-purple-500/30 text-purple-500/80 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-xs font-bold">■</span>
            </button>

            {/* CIRCLE (◯) - DROITE - BACK */}
            <button
              onPointerDown={() => sendAction('BACK', 'down')}
              onPointerUp={() => sendAction('BACK', 'up')}
              onPointerLeave={() => sendAction('BACK', 'up')}
              onPointerCancel={() => sendAction('BACK', 'up')}
              className={`absolute right-2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
                activeButton === 'BACK'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                  : 'bg-zinc-900/80 border-rose-500/30 text-rose-500/80 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-sm font-bold">◯</span>
            </button>
          </div>

          <VirtualJoystick side="RIGHT" onMove={handleRightJoystickMove} onEnd={handleRightJoystickEnd} />
        </div>

      </div>

      {/* Guide d'utilisation en bas */}
      <div className="w-full text-center py-2 text-zinc-550 text-[8px] font-mono tracking-wide">
        Toucher les boutons ou utiliser le clavier [ Z/Q/S/D / Flèches / Espace / Entrée / Échap / L (L) / R (R) / Shift (Select) ]
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
