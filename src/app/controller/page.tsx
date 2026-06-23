'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Gamepad, Wifi, WifiOff, RefreshCw, Smartphone, User, Maximize } from 'lucide-react';

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

// ============================================================================
// Fullscreen Splash Gate
// ============================================================================
function FullscreenGate({ onEnter }: { onEnter: () => void }) {
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterFullscreen = async () => {
    try {
      // Request fullscreen on the document element
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen({ navigationUI: 'hide' });
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (e) {
      console.warn('[Controller] Fullscreen request failed:', e);
    }

    // Lock orientation to landscape
    try {
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape');
      }
    } catch (e) {
      console.warn('[Controller] Orientation lock failed:', e);
    }

    // Proceed regardless of fullscreen support
    onEnter();
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center z-[999999] select-none overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 30% 30%, rgba(0, 114, 206, 0.2) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(107, 33, 168, 0.2) 0%, transparent 50%), #020617',
      }}
    >
      {/* Animated rings */}
      <div className={`absolute w-96 h-96 rounded-full border border-blue-500/10 transition-all duration-[2000ms] ${animReady ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
      <div className={`absolute w-72 h-72 rounded-full border border-purple-500/10 transition-all duration-[2000ms] delay-200 ${animReady ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
      <div className={`absolute w-48 h-48 rounded-full border border-cyan-500/10 transition-all duration-[2000ms] delay-400 ${animReady ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />

      {/* Gamepad icon */}
      <div className={`mb-6 transition-all duration-1000 ${animReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)]">
          <Gamepad size={36} className="text-blue-400" />
        </div>
      </div>

      {/* Title */}
      <div className={`text-center mb-8 transition-all duration-1000 delay-300 ${animReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <h1 className="text-2xl font-extrabold tracking-[0.2em] bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent uppercase mb-2">
          Funny Station
        </h1>
        <p className="text-zinc-400 text-sm font-medium">Manette Virtuelle</p>
      </div>

      {/* Enter button */}
      <button
        onClick={handleEnterFullscreen}
        className={`group relative px-10 py-4 rounded-2xl border-2 border-blue-500/50 bg-blue-500/10 backdrop-blur-sm hover:bg-blue-500/20 hover:border-blue-400 active:scale-95 transition-all duration-300 cursor-pointer ${animReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        style={{ transitionDelay: '500ms' }}
      >
        <div className="flex items-center gap-3">
          <Maximize size={20} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
          <span className="text-base font-extrabold uppercase tracking-widest text-blue-300 group-hover:text-white transition-colors">
            Appuyer pour entrer
          </span>
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/30 animate-ping pointer-events-none" />
      </button>

      {/* Hint */}
      <p className={`mt-6 text-zinc-500 text-[10px] font-mono tracking-wider text-center max-w-xs transition-all duration-1000 delay-700 ${animReady ? 'opacity-100' : 'opacity-0'}`}>
        Le mode plein écran masque la barre du navigateur pour une expérience immersive
      </p>
    </div>
  );
}

// ============================================================================
// Main Controller Content
// ============================================================================
function ControllerContent() {
  const searchParams = useSearchParams();
  const lobbyId = searchParams.get('lobbyId') || 'demo-lobby';
  // Runtime du jeu en cours → adapte le layout de la manette.
  // GBA = 2 boutons (A/B) uniquement. PSP = 4 boutons PlayStation (✕◯■▲) → layout complet conservé.
  const runtime = searchParams.get('runtime') || '';
  const isGba = runtime === 'gba';
  // Chaque téléphone génère un ID unique stable (pas de userId dans l'URL pour le multi)
  const userIdRef = useRef(
    searchParams.get('userId') || `mobile-${Math.random().toString(36).substring(2, 9)}`
  );
  const userId = userIdRef.current;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const channelRef = useRef<any>(null);

  // Track fullscreen exit to re-show the gate
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (!isFS && isFullscreen) {
        // User exited fullscreen (e.g. swipe down on Android), don't reset gate
        // Just keep the controller visible but try to re-enter fullscreen on next touch
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Bloque le menu contextuel mobile (appui long → "imprimer / télécharger / enregistrer")
  // et la sélection de texte, pour que l'appui long sur une touche reste une commande.
  useEffect(() => {
    const preventContext = (e: Event) => e.preventDefault();
    const preventSelect = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('selectstart', preventSelect);
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('selectstart', preventSelect);
    };
  }, []);

  // Cleanup: unlock orientation on unmount
  useEffect(() => {
    return () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch (e) {
        // Silently ignore
      }
      // Exit fullscreen on unmount
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen();
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
        // Latence minimale : pas d'écho local (self) ni d'attente d'accusé (ack)
        // → l'input part instantanément vers la console.
        broadcast: { self: false, ack: false },
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
    const threshold = 0.22; // seuil bas = joystick plus réactif (moins de course morte)
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
    const threshold = 0.22; // seuil bas = joystick plus réactif (moins de course morte)
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
        case ' ':
          sendAction('CONFIRM', 'down');
          break;
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
        case ' ':
          sendAction('CONFIRM', 'up');
          break;
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

  // =============================================
  // FULLSCREEN GATE — show splash until user taps
  // =============================================
  if (!isFullscreen) {
    return <FullscreenGate onEnter={() => setIsFullscreen(true)} />;
  }

  // =============================================
  // MAIN CONTROLLER UI (fullscreen)
  // =============================================
  return (
    <div 
      className="controller-landscape fixed inset-0 select-none overflow-hidden flex flex-col justify-between text-white"
      style={{
        width: '100vw',
        height: '100dvh',
        padding: 'env(safe-area-inset-top, 4px) env(safe-area-inset-right, 8px) env(safe-area-inset-bottom, 4px) env(safe-area-inset-left, 8px)',
        background: 'radial-gradient(circle at 20% 20%, rgba(0, 114, 206, 0.15) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(107, 33, 168, 0.15) 0%, transparent 45%), #020617',
      }}
    >
      
      {/* Compact Status Bar — minimal to save space */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-950/40 border border-zinc-800/40 backdrop-blur-sm" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          {playerColor ? (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${playerColor.bg} ${playerColor.border} border`}>
              <User size={10} className={playerColor.text} />
              <span className={`text-[9px] uppercase tracking-widest font-black ${playerColor.text}`}>
                {playerColor.label}
              </span>
            </div>
          ) : (
            <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">
              Funny Station
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {latency > 0 && (
            <span className="text-[8px] font-mono text-zinc-500">{latency}ms</span>
          )}
          {isConnected ? (
            <div className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold">
              <Wifi size={10} />
              <span>OK</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-500 text-[9px] font-bold">
              <WifiOff size={10} className="animate-bounce" />
              <span>...</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION BOUTONS L & R (Gâchettes Épaules) */}
      <div className="w-full flex justify-between px-6" style={{ flexShrink: 0 }}>
        {/* BOUTON GAUCHE L */}
        <button
          onPointerDown={() => sendAction('L', 'down')}
          onPointerUp={() => sendAction('L', 'up')}
          onPointerLeave={() => sendAction('L', 'up')}
          onPointerCancel={() => sendAction('L', 'up')}
          className={`w-28 py-2.5 rounded-b-2xl border-x border-b transition-all duration-150 active:scale-95 text-xs font-black uppercase tracking-widest text-center cursor-pointer ${
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
          className={`w-28 py-2.5 rounded-b-2xl border-x border-b transition-all duration-150 active:scale-95 text-xs font-black uppercase tracking-widest text-center cursor-pointer ${
            activeButton === 'R'
              ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_4px_10px_rgba(244,63,94,0.3)]'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          R
        </button>
      </div>

      {/* Zone du Gamepad principal — takes all available space */}
      <div className="flex-1 w-full flex items-center justify-between px-2 md:px-12 my-auto relative" style={{ minHeight: 0 }}>
        
        {/* SECTION GAUCHE : D-PAD + JOYSTICK GAUCHE */}
        <div className="flex flex-col items-center gap-2 select-none">
          <div className="relative w-36 h-36 rounded-full flex items-center justify-center bg-zinc-950/40 border border-zinc-800/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
            {/* Support Circulaire Central */}
            <div className="absolute w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 shadow-md z-10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-zinc-950/90 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-zinc-800 flex items-center justify-center">
                <Gamepad size={10} className="text-zinc-600" />
              </div>
            </div>

            {/* Boutons Directionnels */}
            {/* HAUT */}
            <button
              onPointerDown={() => sendAction('UP', 'down')}
              onPointerUp={() => sendAction('UP', 'up')}
              onPointerLeave={() => sendAction('UP', 'up')}
              onPointerCancel={() => sendAction('UP', 'up')}
              className={`absolute top-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
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
              className={`absolute bottom-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
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
              className={`absolute left-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
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
              className={`absolute right-1.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
                activeButton === 'RIGHT'
                  ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/60'
              } border`}
            >
              <span className={`text-sm font-extrabold transition-colors ${activeButton === 'RIGHT' ? 'text-blue-400' : 'text-zinc-400'}`}>▶</span>
            </button>
          </div>
          
          <VirtualJoystick side="LEFT" onMove={handleLeftJoystickMove} onEnd={handleLeftJoystickEnd} />
        </div>

        {/* SECTION CENTRALE : SELECT / START / OPTIONS */}
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="text-center">
            <span className="text-[10px] font-extrabold tracking-[0.3em] bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent uppercase drop-shadow-[0_0_8px_rgba(0,114,206,0.3)]">
              Funny Station
            </span>
          </div>

          {/* Boutons Select, Start et Options */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex gap-3">
              {/* SELECT */}
              <button
                onPointerDown={() => sendAction('SELECT', 'down')}
                onPointerUp={() => sendAction('SELECT', 'up')}
                onPointerLeave={() => sendAction('SELECT', 'up')}
                onPointerCancel={() => sendAction('SELECT', 'up')}
                className={`px-3.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95 text-[9px] uppercase tracking-widest font-black cursor-pointer ${
                  activeButton === 'SELECT'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-white'
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
                className={`px-3.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95 text-[9px] uppercase tracking-widest font-black cursor-pointer ${
                  activeButton === 'START'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-white'
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
              className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border transition-all duration-150 active:scale-95 text-[8px] uppercase tracking-widest font-bold cursor-pointer ${
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
        <div className="flex flex-col items-center gap-2 select-none">
          <div className="relative w-36 h-36 rounded-full flex items-center justify-center bg-zinc-950/40 border border-zinc-800/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
            {/* Support Circulaire Central */}
            <div className="absolute w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 shadow-md z-10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-zinc-950/90 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-zinc-800 flex items-center justify-center">
                <span className="text-[6px] font-black tracking-widest text-zinc-500 uppercase">Action</span>
              </div>
            </div>

            {/* TRIANGLE (▲) - HAUT — toujours présent ; inactif sur GBA (pas de bouton Y) */}
            <button
              disabled={isGba}
              onPointerDown={() => { if (!isGba) sendAction('TRIANGLE', 'down'); }}
              onPointerUp={() => { if (!isGba) sendAction('TRIANGLE', 'up'); }}
              onPointerLeave={() => { if (!isGba) sendAction('TRIANGLE', 'up'); }}
              onPointerCancel={() => { if (!isGba) sendAction('TRIANGLE', 'up'); }}
              className={`absolute top-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 ${isGba ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${
                activeButton === 'TRIANGLE'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                  : 'bg-zinc-900/80 border-emerald-500/30 text-emerald-500/80 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-sm font-bold">▲</span>
            </button>

            {/* CROSS (✕) - BAS - CONFIRM (= bouton A sur GBA/PSP) */}
            <button
              onPointerDown={() => sendAction('CONFIRM', 'down')}
              onPointerUp={() => sendAction('CONFIRM', 'up')}
              onPointerLeave={() => sendAction('CONFIRM', 'up')}
              onPointerCancel={() => sendAction('CONFIRM', 'up')}
              className={`absolute bottom-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
                activeButton === 'CONFIRM'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                  : 'bg-zinc-900/80 border-cyan-500/30 text-cyan-500/80 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-sm font-bold">{isGba ? 'A' : '✕'}</span>
            </button>

            {/* SQUARE (■) - GAUCHE — toujours présent ; inactif sur GBA (pas de bouton X) */}
            <button
              disabled={isGba}
              onPointerDown={() => { if (!isGba) sendAction('SQUARE', 'down'); }}
              onPointerUp={() => { if (!isGba) sendAction('SQUARE', 'up'); }}
              onPointerLeave={() => { if (!isGba) sendAction('SQUARE', 'up'); }}
              onPointerCancel={() => { if (!isGba) sendAction('SQUARE', 'up'); }}
              className={`absolute left-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 ${isGba ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${
                activeButton === 'SQUARE'
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                  : 'bg-zinc-900/80 border-purple-500/30 text-purple-500/80 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-xs font-bold">■</span>
            </button>

            {/* CIRCLE (◯) - DROITE - BACK (= bouton B sur GBA/PSP) */}
            <button
              onPointerDown={() => sendAction('BACK', 'down')}
              onPointerUp={() => sendAction('BACK', 'up')}
              onPointerLeave={() => sendAction('BACK', 'up')}
              onPointerCancel={() => sendAction('BACK', 'up')}
              className={`absolute right-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 border-2 cursor-pointer ${
                activeButton === 'BACK'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                  : 'bg-zinc-900/80 border-rose-500/30 text-rose-500/80 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-sm font-bold">{isGba ? 'B' : '◯'}</span>
            </button>
          </div>

          <VirtualJoystick side="RIGHT" onMove={handleRightJoystickMove} onEnd={handleRightJoystickEnd} />
        </div>

      </div>

      {/* Empty bottom spacer to account for safe area */}
      <div style={{ flexShrink: 0, height: '2px' }} />

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
