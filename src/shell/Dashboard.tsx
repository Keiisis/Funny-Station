'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CoverImage } from './CoverImage';
import { Game, Trophy, NetworkMode, OnlinePlayer, ProfileData } from '@/types';
import { useGamepadNavigation } from '@/hooks/useGamepadNavigation';
import { TopBar } from './TopBar';
import { StoreView } from './StoreView';
import { ProfileSpace } from './ProfileSpace';
import { UniversalRuntimeRunner, TrophyUnlockPayload } from '@/kernel/UniversalRuntimeRunner';
import { AudioEngine } from '@/drivers/AudioEngine';
import { FunnyStudio } from './FunnyStudio';
import { Play, Code, Trophy as TrophyIcon, CornerDownLeft, Gamepad, Smartphone, Users, Globe, Copy, Check, Lock, Coins, ShoppingBag, Power } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import QRCode from 'qrcode';
import { GameRoom } from '@/multiplayer/GameRoom';
import { GameStateSync } from '@/multiplayer/GameStateSync';
import { DynamicAura } from './DynamicAura';
import { WebGLBackground } from '@/drivers/WebGLBackground';
import { ControlCenter } from './ControlCenter';
import { ShutdownScreen } from './ShutdownScreen';
import { loadKeyMapping, saveKeyMapping, KeyMapping, ConsoleAction, DEFAULT_KEY_MAPPING, ACTION_LABELS, makeKeyboardEvent } from '@/utils/inputMapping';
import { createConsoleRtc, ConsoleRtc } from '@/utils/rtcLink';
import {
  fetchPublishedGames,
  fetchGamesByAuthor,
  fetchTrophiesForGame,
  fetchUnlockedTrophyIds,
  buyGame,
  publishGame,
  deleteGame,
  setGameStatus,
  incrementPlayCount,
} from '@/lib/db';

// Couleurs par joueur pour l'UI
const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400', label: 'Joueur 1' },
  { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-400', label: 'Joueur 2' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Joueur 3' },
  { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400', label: 'Joueur 4' },
];

// Mapping clavier par joueur (P1: Flèches, P2: ZQSD, P3: IJKL, P4: Numpad)
const PLAYER_KEY_MAPS: Record<string, string>[] = [
  { 'UP': 'ArrowUp', 'DOWN': 'ArrowDown', 'LEFT': 'ArrowLeft', 'RIGHT': 'ArrowRight', 'CONFIRM': 'Enter', 'BACK': 'Escape', 'OPTION': 'Escape', 'TRIANGLE': 'ArrowUp', 'SQUARE': ' ', 'SELECT': 'Tab', 'START': 'Escape', 'L': 'l', 'R': 'r' },
  { 'UP': 'w', 'DOWN': 's', 'LEFT': 'a', 'RIGHT': 'd', 'CONFIRM': 'e', 'BACK': 'q', 'OPTION': 'q', 'TRIANGLE': 'w', 'SQUARE': 'f', 'SELECT': '1', 'START': '2', 'L': 'c', 'R': 'v' },
  { 'UP': 'i', 'DOWN': 'k', 'LEFT': 'j', 'RIGHT': 'l', 'CONFIRM': 'o', 'BACK': 'u', 'OPTION': 'u', 'TRIANGLE': 'i', 'SQUARE': 'h', 'SELECT': '7', 'START': '8', 'L': 'n', 'R': 'm' },
  { 'UP': '8', 'DOWN': '5', 'LEFT': '4', 'RIGHT': '6', 'CONFIRM': '0', 'BACK': '7', 'OPTION': '7', 'TRIANGLE': '8', 'SQUARE': '1', 'SELECT': '/', 'START': '*', 'L': '-', 'R': '+' },
];

interface ConnectedPlayer {
  userId: string;
  playerNumber: number;
  connectedAt: string;
}

// Badge console affiché sur chaque jaquette de la bibliothèque.
const RUNTIME_BADGE: Record<string, { label: string; cls: string }> = {
  gba: { label: 'GBA', cls: 'bg-emerald-500/90 text-white' },
  nes: { label: 'NES', cls: 'bg-red-500/90 text-white' },
  snes: { label: 'SNES', cls: 'bg-violet-500/90 text-white' },
  psp: { label: 'PSP', cls: 'bg-fuchsia-500/90 text-white' },
  js: { label: 'JEU', cls: 'bg-sky-500/90 text-white' },
  wasm: { label: 'WASM', cls: 'bg-orange-500/90 text-white' },
  python: { label: 'PY', cls: 'bg-blue-500/90 text-white' },
  lua: { label: 'LUA', cls: 'bg-indigo-500/90 text-white' },
  java: { label: 'JAVA', cls: 'bg-rose-500/90 text-white' },
  android: { label: 'APK', cls: 'bg-lime-500/90 text-zinc-900' },
};

interface DashboardProps {
  profile: ProfileData;
  onSignOut: () => void;
  onUpdateProfile: (updated: ProfileData) => void;
  /** Recharge le profil depuis Supabase (après achat/trophée) — branché en Phase 3. */
  onRefreshProfile?: () => void | Promise<void>;
}

// Plus de DEFAULT_GAMES / MOCK_TROPHIES : tout vient de Supabase (lib/db.ts).

export function encodePathSegments(url: string): string {
  return url
    .split('/')
    .map((segment) => {
      if (!segment || segment.endsWith(':')) return segment;
      return encodeURIComponent(segment);
    })
    .join('/');
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, onSignOut, onUpdateProfile, onRefreshProfile }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]); // rail "Continuer"
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [unlockedTrophyIds, setUnlockedTrophyIds] = useState<string[]>([]);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  
  // Clean up all cached object URLs on unmount
  useEffect(() => {
    return () => {
      videoCacheRef.current.forEach((url) => {
        if (url.startsWith('blob:')) {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }
      });
      videoCacheRef.current.clear();
    };
  }, []);
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const navInitRef = useRef(true);

  // Retour "console" au changement de jeu focalisé : son de navigation + vibration légère.
  useEffect(() => {
    if (navInitRef.current) { navInitRef.current = false; return; }
    AudioEngine.getInstance().playSFX('navigate');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
  }, [focusedIndex]);

  // Auto-scroll the focused carousel item into view (PS5-style continuous list scroll)
  useEffect(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const items = container.children;
    if (items && items[focusedIndex]) {
      const activeItem = items[focusedIndex] as HTMLElement;
      const itemLeft = activeItem.offsetLeft;
      
      // Align to the left with a 64px offset (matches our px-16 padding) so upcoming games stretch to the right
      const targetScrollLeft = itemLeft - 64;
      
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }
  }, [focusedIndex]);

  // Tab views
  const [activeTab, setActiveTab] = useState<'games' | 'store' | 'profile'>('games');

  // Control Center & Power Menu Systems
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);
  const [isPowerMenuOpen, setIsPowerMenuOpen] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [powerFocusedIndex, setPowerFocusedIndex] = useState(0);
  const [gamepadConnected, setGamepadConnected] = useState(false);

  const [isControllerModalOpen, setIsControllerModalOpen] = useState(false);
  const [controllerType, setControllerType] = useState<'pc' | 'mobile' | 'online' | null>(null);
  const [lobbyId, setLobbyId] = useState<string>('');
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  
  const [listeningAction, setListeningAction] = useState<ConsoleAction | null>(null);
  const [keyMapping, setKeyMapping] = useState<KeyMapping>(loadKeyMapping());

  // Écouter les changements globaux de mappage
  useEffect(() => {
    const handleMappingChange = (e: any) => {
      setKeyMapping(e.detail);
    };
    window.addEventListener('funny_station_mapping_changed', handleMappingChange);
    return () => window.removeEventListener('funny_station_mapping_changed', handleMappingChange);
  }, []);

  // Intercepter les touches pour le remappage
  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignorer les touches modificatrices nues (Shift/Control/Alt) sauf Tab ou Escape
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key) && e.key !== 'Tab' && e.key !== 'Escape') {
        return;
      }

      const updated = { ...keyMapping, [listeningAction]: e.key };
      setKeyMapping(updated);
      saveKeyMapping(updated);
      setListeningAction(null);
      AudioEngine.getInstance().playSFX('select');
    };

    window.addEventListener('keydown', handleKeyCapture, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyCapture, { capture: true });
  }, [listeningAction, keyMapping]);
  const connectedPlayersRef = useRef<ConnectedPlayer[]>([]);
  const rtcRef = useRef<ConsoleRtc | null>(null);
  // Canal lobby + contexte de jeu courant : pour diffuser aux manettes le runtime
  // du jeu en cours → adaptation dynamique du layout (anti-conflit de touches).
  const lobbyChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const gameContextRef = useRef<{ runtime: string; slug: string; title: string }>({ runtime: '', slug: '', title: '' });
  useEffect(() => {
    connectedPlayersRef.current = connectedPlayers;
  }, [connectedPlayers]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Online multiplayer state
  const [onlineMode, setOnlineMode] = useState<'menu' | 'host' | 'join' | 'lobby'>('menu');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [onlineCopied, setOnlineCopied] = useState(false);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('local');
  const [localPlayerNumber, setLocalPlayerNumber] = useState(0);
  const onlineRoomRef = useRef<GameRoom | null>(null);
  const onlineSyncRef = useRef<GameStateSync | null>(null);
  const [onlineHostQrCodeUrl, setOnlineHostQrCodeUrl] = useState<string>('');
  const [showOnlineControllerQr, setShowOnlineControllerQr] = useState(false);

  // Chargement du catalogue depuis Supabase (jeux publiés + brouillons de l'auteur).
  const reloadGames = useCallback(async () => {
    try {
      const published = await fetchPublishedGames();
      const mine = profile.accountType === 'creator' ? await fetchGamesByAuthor(profile.id) : [];
      // Fusion sans doublons : les jeux de l'auteur (brouillons inclus) en premier.
      const map = new Map<string, Game>();
      [...mine, ...published].forEach((g) => map.set(g.id, g));
      setGames(Array.from(map.values()));
    } catch (e) {
      console.error('[Dashboard] Échec du chargement des jeux:', e);
    }
  }, [profile.id, profile.accountType]);

  useEffect(() => {
    reloadGames();
  }, [reloadGames]);

  // Rail « Continuer » : jeux récemment joués par CE compte (d'après game_saves.updated_at).
  useEffect(() => {
    if (games.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('game_saves')
        .select('game_id, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(16);
      if (cancelled || !data) return;
      const seen = new Set<string>();
      const ordered: Game[] = [];
      for (const row of data as { game_id: string }[]) {
        if (seen.has(row.game_id)) continue;
        seen.add(row.game_id);
        const g = games.find((x) => x.id === row.game_id);
        if (g) ordered.push(g);
        if (ordered.length >= 8) break;
      }
      setRecentGames(ordered);
    })();
    return () => { cancelled = true; };
  }, [games, profile.id]);

  // Trophées déjà débloqués par l'utilisateur (état global, toutes parties confondues).
  useEffect(() => {
    fetchUnlockedTrophyIds(profile.id)
      .then(setUnlockedTrophyIds)
      .catch((e) => console.error('[Dashboard] Trophées débloqués:', e));
  }, [profile.id]);

  // --- PERSISTANCE DE LA SESSION ---

  // Restaurer l'état depuis sessionStorage au chargement
  useEffect(() => {
    const savedTab = sessionStorage.getItem('funny_station_active_tab');
    if (savedTab && ['games', 'store', 'profile'].includes(savedTab)) {
      setActiveTab(savedTab as any);
    }

    const savedFocusedIndex = sessionStorage.getItem('funny_station_focused_index');
    if (savedFocusedIndex) {
      const idx = parseInt(savedFocusedIndex, 10);
      if (!isNaN(idx) && idx >= 0) {
        setFocusedIndex(idx);
      }
    }
  }, []);

  // Restaurer le jeu en cours d'exécution une fois les jeux chargés
  useEffect(() => {
    const savedGameSlug = sessionStorage.getItem('funny_station_selected_game_slug');
    if (savedGameSlug && games.length > 0) {
      const game = games.find(g => g.slug === savedGameSlug);
      if (game) {
        setSelectedGame(game);
      }
    }
  }, [games]);

  // Sauvegarder l'onglet actif
  useEffect(() => {
    sessionStorage.setItem('funny_station_active_tab', activeTab);
  }, [activeTab]);

  // Sauvegarder l'index du jeu focalisé
  useEffect(() => {
    if (games.length > 0) {
      sessionStorage.setItem('funny_station_focused_index', focusedIndex.toString());
    }
  }, [focusedIndex, games]);

  // Sauvegarder le jeu en cours de lecture
  useEffect(() => {
    if (selectedGame) {
      sessionStorage.setItem('funny_station_selected_game_slug', selectedGame.slug);
    } else {
      sessionStorage.removeItem('funny_station_selected_game_slug');
    }
  }, [selectedGame]);

  // QR Code generator
  useEffect(() => {
    if (!lobbyId || typeof window === 'undefined') {
      setQrCodeUrl('');
      return;
    }
    // On passe le runtime du jeu focalisé pour que la manette adapte son layout (ex: GBA).
    const runtimeParam = games[focusedIndex]?.runtime || '';
    const controllerUrl = `${window.location.origin}/controller?lobbyId=${lobbyId}&runtime=${runtimeParam}`;
    QRCode.toDataURL(controllerUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Erreur génération QR Code local:', err));
  }, [lobbyId, games, focusedIndex]);

  // Gamepads Presence Channel
  useEffect(() => {
    if (controllerType !== 'mobile' || !lobbyId) {
      setConnectedPlayers([]);
      return;
    }

    console.log(`[Dashboard] Connexion au canal multi-manettes: lobby:${lobbyId}`);
    const channel = supabase.channel(`lobby:${lobbyId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: `console-${profile.id}` }
      }
    });
    lobbyChannelRef.current = channel;

    // Diffuse aux manettes le runtime du jeu courant → adaptation dynamique du layout.
    const broadcastGameContext = () => {
      channel.send({ type: 'broadcast', event: 'game_context', payload: { ...gameContextRef.current } });
    };
    // Une manette qui (re)joint demande le contexte → on lui renvoie aussitôt.
    channel.on('broadcast', { event: 'request_context' }, () => broadcastGameContext());

    // Traitement d'un input manette — partagé par le broadcast Supabase ET la liaison
    // P2P (WebRTC). Quel que soit le transport, l'input pilote le jeu de la même façon.
    const processControllerInput = (payload: any) => {
      const { userId, direction, action, clientPlayerId } = payload;

      // Si le payload contient un clientPlayerId, n'accepter que les inputs destinés à cette console
      if (clientPlayerId && clientPlayerId !== profile.id) return;

      const playerIdx = connectedPlayersRef.current.findIndex(p => p.userId === userId);
      const playerNumber = playerIdx >= 0 ? connectedPlayersRef.current[playerIdx].playerNumber : 0;
      const effectiveAction = action || 'down';
      
      window.dispatchEvent(
        new CustomEvent('funny_gamepad_action', { 
          detail: { direction, playerNumber, userId, action: effectiveAction } 
        })
      );
      
      let keyName = '';
      if (playerNumber === 0) {
        // Mappage dynamique pour le joueur local (Player 1)
        const customMapping = loadKeyMapping();
        let consoleAction: ConsoleAction = direction as ConsoleAction;
        if (direction === 'CONFIRM') consoleAction = 'A';
        else if (direction === 'BACK') consoleAction = 'B';
        else if (direction === 'SQUARE') consoleAction = 'X';
        else if (direction === 'TRIANGLE') consoleAction = 'Y';
        else if (direction === 'OPTION') consoleAction = 'START';
        
        keyName = customMapping[consoleAction] || '';
      } else {
        const keyMap = PLAYER_KEY_MAPS[playerNumber] || PLAYER_KEY_MAPS[0];
        keyName = keyMap[direction];
      }
      
      if (keyName) {
        const evType = effectiveAction === 'down' ? 'keydown' : 'keyup';
        // Événement COMPLET (key + code + keyCode) — sinon Unity WebGL l'ignore.
        window.dispatchEvent(makeKeyboardEvent(evType, keyName));

        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
              // Unity écoute sur le document/canvas du jeu → on cible les deux + la window.
              iframeWindow.document.dispatchEvent(makeKeyboardEvent(evType, keyName));
              iframeWindow.dispatchEvent(makeKeyboardEvent(evType, keyName));
              const canvas = iframeWindow.document.querySelector('canvas');
              if (canvas) canvas.dispatchEvent(makeKeyboardEvent(evType, keyName));
            }
          } catch (e) {
            console.warn('[Dashboard] Impossible de relayer les inputs dans l\'iframe:', e);
          }
        });
      }
    };

    // Transport 1 : broadcast Supabase (toujours actif, repli universel).
    channel.on('broadcast', { event: 'controller_state' }, ({ payload }: any) => processControllerInput(payload));

    // Transport 2 : liaison P2P (WebRTC). Le signaling passe par ce même canal ;
    // une fois ouverte, la manette envoie ses inputs en direct (latence minimale).
    const rtc = createConsoleRtc(
      (event, p) => channel.send({ type: 'broadcast', event, payload: p }),
      processControllerInput,
    );
    rtcRef.current = rtc;
    channel.on('broadcast', { event: 'rtc_offer' }, ({ payload }: any) => rtc.handleSignal('rtc_offer', payload));
    channel.on('broadcast', { event: 'rtc_ice' }, ({ payload }: any) => rtc.handleSignal('rtc_ice', payload));

    let lastPingTime = 0;
    channel.on('broadcast', { event: 'pong' }, ({ payload }: any) => {
      const pingDuration = Date.now() - lastPingTime;
      channel.send({
        type: 'broadcast',
        event: 'latency_update',
        payload: { userId: payload.userId, latency: pingDuration }
      });
    });

    const pingInterval = setInterval(() => {
      lastPingTime = Date.now();
      channel.send({
        type: 'broadcast',
        event: 'ping',
        payload: {}
      });
    }, 3000);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const controllers: ConnectedPlayer[] = [];
        
        Object.entries(state).forEach(([key, presences]: [string, any]) => {
          presences.forEach((p: any) => {
            if (p.type === 'controller') {
              controllers.push({
                userId: p.userId,
                playerNumber: 0,
                connectedAt: p.online_at || new Date().toISOString()
              });
            }
          });
        });
        
        // Trier par date de connexion, puis par userId pour un ordre déterministe
        controllers.sort((a, b) => {
          const timeCompare = a.connectedAt.localeCompare(b.connectedAt);
          if (timeCompare !== 0) return timeCompare;
          return a.userId.localeCompare(b.userId);
        });
        controllers.forEach((c, idx) => {
          c.playerNumber = Math.min(idx, 3);
        });
        
        // Ne broadcaster que si les assignations ont changé
        const prevMap = new Map(connectedPlayersRef.current.map(c => [c.userId, c.playerNumber]));
        const hasChanges = controllers.length !== connectedPlayersRef.current.length ||
          controllers.some(c => prevMap.get(c.userId) !== c.playerNumber);
        
        setConnectedPlayers(controllers);
        
        if (hasChanges) {
          controllers.forEach(c => {
            channel.send({
              type: 'broadcast',
              event: 'player_assignment',
              payload: { 
                userId: c.userId, 
                playerNumber: c.playerNumber, 
                totalPlayers: controllers.length 
              }
            });
          });
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString(), type: 'console' });
          // Annonce que la console est prête : les manettes déjà connectées (re)lancent
          // la négociation P2P pour ouvrir leur DataChannel basse latence.
          rtc.announce();
          // Donne le contexte de jeu courant aux manettes déjà là.
          broadcastGameContext();
        }
      });

    return () => {
      clearInterval(pingInterval);
      rtc.close();
      rtcRef.current = null;
      lobbyChannelRef.current = null;
      channel.unsubscribe();
    };
  }, [controllerType, lobbyId, profile.id]);

  // Met à jour le contexte de jeu (runtime du jeu LANCÉ, sinon du jeu focalisé) et le
  // diffuse en direct aux manettes → leur layout s'adapte instantanément au système.
  useEffect(() => {
    const ctxGame = selectedGame || games[focusedIndex];
    const ctx = ctxGame
      ? { runtime: ctxGame.runtime, slug: ctxGame.slug, title: ctxGame.title }
      : { runtime: '', slug: '', title: '' };
    gameContextRef.current = ctx;
    lobbyChannelRef.current?.send({ type: 'broadcast', event: 'game_context', payload: ctx });
  }, [selectedGame, focusedIndex, games]);

  const activeGame = games[focusedIndex];

  const [videoSrc, setVideoSrc] = useState<string>('');
  const videoCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!activeGame || !activeGame.video_url) {
      setVideoSrc('');
      return;
    }
    // On pointe DIRECTEMENT la balise <video> sur le proxy anti-IDM (octet-stream).
    // Le navigateur streame alors en natif AVEC Range → démarrage quasi-instant,
    // lecture progressive et seek fluide (fini le téléchargement complet en blob,
    // qui annulait le streaming et faisait patienter). Anti-IDM préservé.
    const base64Key = btoa(unescape(encodeURIComponent(activeGame.video_url)));
    setVideoSrc(`/api/media?key=${base64Key}`);
  }, [activeGame?.id, activeGame?.video_url]);

  // Gestion de l'état de jeu en cours pour suspendre la musique de fond
  useEffect(() => {
    if (selectedGame) {
      AudioEngine.getInstance().setGameRunning(true);
    } else {
      AudioEngine.getInstance().setGameRunning(false);
    }
  }, [selectedGame]);

  // Ambient sound focusing
  useEffect(() => {
    if (!selectedGame && !isStudioOpen && activeGame && activeTab === 'games') {
      AudioEngine.getInstance().playAmbientMusic(activeGame.ambient_music_url);
    } else {
      AudioEngine.getInstance().stopAmbientMusic();
    }
  }, [focusedIndex, selectedGame, isStudioOpen, activeGame, activeTab]);

  // Trophées du jeu focalisé (chargés depuis la DB).
  const activeGameId = activeGame?.id;
  useEffect(() => {
    if (!activeGameId) return;
    let cancelled = false;
    fetchTrophiesForGame(activeGameId)
      .then((t) => { if (!cancelled) setTrophies(t); })
      .catch((e) => console.error('[Dashboard] Trophées du jeu:', e));
    return () => { cancelled = true; };
  }, [activeGameId]);

  // PRÉCHAUFFAGE émulateurs : dès qu'un jeu GBA/PSP est focalisé, on précharge le
  // moteur EmulatorJS + la ROM en arrière-plan → démarrage quasi-instantané au clic « Jouer ».
  const activeGameRuntime = activeGame?.runtime;
  const activeGameRomUrl = activeGame ? encodePathSegments(`${activeGame.assets_bucket_path}/${activeGame.entry_point}`) : '';
  useEffect(() => {
    if (activeGameRuntime !== 'gba' && activeGameRuntime !== 'psp') return;
    const links: HTMLLinkElement[] = [];
    const prefetch = (href: string, as?: string) => {
      const l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      if (as) l.as = as;
      if (as === 'fetch') l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
      links.push(l);
    };
    prefetch('https://cdn.emulatorjs.org/stable/data/loader.js', 'script');
    if (activeGameRomUrl) prefetch(activeGameRomUrl, 'fetch');
    return () => { links.forEach((l) => l.remove()); };
  }, [activeGameRuntime, activeGameRomUrl]);

  const handleStartGame = () => {
    if (!activeGame) return;
    if (!isGameOwned(activeGame)) {
      handleBuyGameDirect(activeGame);
      return;
    }

    AudioEngine.getInstance().playSFX('select');
    AudioEngine.getInstance().setGameRunning(true);
    AudioEngine.getInstance().stopAmbientMusic();
    setSelectedGame(activeGame);
  };

  const handleExitGame = () => {
    AudioEngine.getInstance().playSFX('select');
    AudioEngine.getInstance().setGameRunning(false);
    setSelectedGame(null);

    if (networkMode !== 'local') {
      onlineSyncRef.current?.destroy();
      onlineRoomRef.current?.disconnect();
      onlineRoomRef.current = null;
      onlineSyncRef.current = null;
      setOnlinePlayers([]);
      setNetworkMode('local');
      setOnlineMode('menu');
    }
  };

  const handleTrophyUnlocked = async (trophy: TrophyUnlockPayload) => {
    if (unlockedTrophyIds.includes(trophy.id)) return;
    setUnlockedTrophyIds(prev => [...prev, trophy.id]);

    // L'insertion en DB est déjà faite par le runner (unlockTrophyByKey) ; ici on
    // rafraîchit le solde de coins (crédité par le trigger SQL) et on notifie l'UI.
    await onRefreshProfile?.();

    window.dispatchEvent(new CustomEvent('funny_station_trophy', { detail: { trophy } }));
  };

  const handleOpenStudio = () => {
    AudioEngine.getInstance().playSFX('select');
    setIsStudioOpen(true);
  };

  const handleCloseStudio = () => {
    AudioEngine.getInstance().playSFX('select');
    setIsStudioOpen(false);
  };

  // Check if a game is purchased or free
  const isGameOwned = (game: Game) => {
    if (!game.price || game.price === 0) return true;
    return profile.ownedGames.includes(game.id) || game.author_id === profile.id;
  };

  // Achat direct depuis l'accueil — RPC atomique côté serveur (anti-triche).
  const handleBuyGameDirect = async (game: Game) => {
    if (!game.price) return;
    if (profile.funnyCoins < game.price) {
      AudioEngine.getInstance().playSFX('navigate');
      alert(`FunnyCoins insuffisants ! Il vous faut ${game.price} FC pour acheter ${game.title}. Débloquez des trophées pour en gagner !`);
      return;
    }
    AudioEngine.getInstance().playSFX('select');
    try {
      await buyGame(game.id);     // débit coins + possession en une transaction
      await onRefreshProfile?.(); // recharge coins + ownedGames depuis la DB
    } catch (e) {
      AudioEngine.getInstance().playSFX('navigate');
      alert(e instanceof Error ? e.message : "L'achat a échoué.");
    }
  };

  // Publication d'un jeu par un créateur : brouillon → upload des fichiers → publication.
  const handlePublishGame = async (
    newGameData: Omit<Game, 'id' | 'author_id' | 'play_count' | 'rating' | 'rating_count' | 'created_at'>,
    file?: File | null
  ) => {
    try {
      // 1. Créer en brouillon pour obtenir un id stable.
      const created = await publishGame(profile.id, { ...newGameData, status: 'draft' });

      // 2. Téléverser les fichiers du jeu (.zip) vers Supabase Storage via /api/install.
      //    L'API détecte le runtime/point d'entrée et met à jour assets_bucket_path.
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('gameId', created.id);
        const res = await fetch('/api/install', { method: 'POST', body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Échec de l'upload des fichiers du jeu.");
      }

      // 3. Publier le jeu (visible dans le Store).
      await setGameStatus(created.id, 'published');
      await reloadGames();
      await onRefreshProfile?.();
    } catch (e) {
      console.error('[Dashboard] Échec de publication:', e);
      alert(e instanceof Error ? e.message : 'La publication a échoué.');
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
      await deleteGame(gameId);
      await reloadGames();
      setFocusedIndex(i => Math.max(0, Math.min(i, games.length - 2)));
    } catch (e) {
      console.error('[Dashboard] Échec de suppression:', e);
      alert(e instanceof Error ? e.message : 'La suppression a échoué.');
    }
  };

  // Gamepad Navigation setup for Games tab
  useGamepadNavigation(
    activeTab === 'games' ? games.length : 0,
    focusedIndex,
    setFocusedIndex,
    handleStartGame,
    onSignOut,
    games.length,
    !!selectedGame || isStudioOpen || isControlCenterOpen || isPowerMenuOpen || isShuttingDown
  );

  const triggerPowerOption = (index: number) => {
    setIsPowerMenuOpen(false);
    if (index === 0) {
      // Mode repos : Déconnexion
      onSignOut();
    } else if (index === 1) {
      // Redémarrer : recharger la page
      window.location.reload();
    } else if (index === 2) {
      // Éteindre
      setIsShuttingDown(true);
    }
  };

  // Detect if a physical gamepad is connected
  useEffect(() => {
    const checkGamepads = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gps = navigator.getGamepads();
        const anyConnected = Array.from(gps).some(gp => gp !== null);
        setGamepadConnected(anyConnected);
      }
    };
    checkGamepads();
    window.addEventListener('gamepadconnected', checkGamepads);
    window.addEventListener('gamepaddisconnected', checkGamepads);
    return () => {
      window.removeEventListener('gamepadconnected', checkGamepads);
      window.removeEventListener('gamepaddisconnected', checkGamepads);
    };
  }, []);

  // Poll physical gamepad for Home/PS button (index 16)
  useEffect(() => {
    if (selectedGame || isShuttingDown) return;

    let holdTimeout: NodeJS.Timeout | null = null;
    let isHolding = false;
    let holdTriggered = false;
    let active = true;

    const checkGamepadHome = () => {
      if (!active) return;
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let homePressed = false;

      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.buttons.length > 16) {
          if (gp.buttons[16].pressed) {
            homePressed = true;
            break;
          }
        }
      }

      if (homePressed) {
        if (!isHolding) {
          isHolding = true;
          holdTriggered = false;
          holdTimeout = setTimeout(() => {
            holdTriggered = true;
            AudioEngine.getInstance().playSFX('select');
            setIsPowerMenuOpen(true);
          }, 1500);
        }
      } else {
        if (isHolding) {
          if (holdTimeout) clearTimeout(holdTimeout);
          if (!holdTriggered) {
            AudioEngine.getInstance().playSFX('select');
            setIsControlCenterOpen(prev => !prev);
          }
          isHolding = false;
          holdTriggered = false;
        }
      }

      requestAnimationFrame(checkGamepadHome);
    };

    const animId = requestAnimationFrame(checkGamepadHome);
    return () => {
      active = false;
      cancelAnimationFrame(animId);
      if (holdTimeout) clearTimeout(holdTimeout);
    };
  }, [selectedGame, isShuttingDown]);

  // Keyboard Escape & Tab listeners
  useEffect(() => {
    if (selectedGame || isStudioOpen || isShuttingDown) return;

    let escapeTimer: NodeJS.Timeout | null = null;
    let isHoldingEscape = false;
    let holdTriggered = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        setIsControlCenterOpen(prev => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (isPowerMenuOpen) {
          e.preventDefault();
          setIsPowerMenuOpen(false);
          AudioEngine.getInstance().playSFX('select');
          return;
        }

        if (isControlCenterOpen) {
          e.preventDefault();
          setIsControlCenterOpen(false);
          AudioEngine.getInstance().playSFX('select');
          return;
        }

        if (!isHoldingEscape) {
          isHoldingEscape = true;
          holdTriggered = false;
          escapeTimer = setTimeout(() => {
            holdTriggered = true;
            AudioEngine.getInstance().playSFX('select');
            setIsPowerMenuOpen(true);
          }, 1500);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (escapeTimer) {
          clearTimeout(escapeTimer);
          escapeTimer = null;
        }
        if (isHoldingEscape) {
          isHoldingEscape = false;
          if (!holdTriggered) {
            AudioEngine.getInstance().playSFX('select');
            setIsControlCenterOpen(prev => !prev);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (escapeTimer) clearTimeout(escapeTimer);
    };
  }, [selectedGame, isStudioOpen, isShuttingDown, isControlCenterOpen, isPowerMenuOpen]);

  // Power Menu navigation
  useEffect(() => {
    if (!isPowerMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const maxOptions = 3;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', -0.1);
        setPowerFocusedIndex(prev => (prev - 1 + maxOptions) % maxOptions);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', 0.1);
        setPowerFocusedIndex(prev => (prev + 1) % maxOptions);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        triggerPowerOption(powerFocusedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        setIsPowerMenuOpen(false);
      }
    };

    const handleGamepadAction = (e: CustomEvent<{ direction: string; action?: string }>) => {
      if (e.detail.action === 'up') return;
      const dir = e.detail.direction;
      const maxOptions = 3;

      if (dir === 'UP') {
        AudioEngine.getInstance().playSFX('navigate', -0.1);
        setPowerFocusedIndex(prev => (prev - 1 + maxOptions) % maxOptions);
      } else if (dir === 'DOWN') {
        AudioEngine.getInstance().playSFX('navigate', 0.1);
        setPowerFocusedIndex(prev => (prev + 1) % maxOptions);
      } else if (dir === 'CONFIRM') {
        AudioEngine.getInstance().playSFX('select');
        triggerPowerOption(powerFocusedIndex);
      } else if (dir === 'BACK') {
        AudioEngine.getInstance().playSFX('select');
        setIsPowerMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('funny_gamepad_action', handleGamepadAction as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('funny_gamepad_action', handleGamepadAction as EventListener);
    };
  }, [isPowerMenuOpen, powerFocusedIndex]);

  // Keyboard option listening for IDE
  useEffect(() => {
    const handleGamepadOption = (e: any) => {
      if (e.detail.direction === 'OPTION') {
        if (selectedGame) return;
        if (isStudioOpen) {
          handleCloseStudio();
        } else {
          handleOpenStudio();
        }
      }
    };
    window.addEventListener('funny_gamepad_action', handleGamepadOption);
    return () => {
      window.removeEventListener('funny_gamepad_action', handleGamepadOption);
    };
  }, [isStudioOpen, selectedGame]);

  useEffect(() => {
    if (!selectedGame) return;

    const handleInputToExit = (e: any) => {
      if (e.key === 'Escape' || e.detail?.direction === 'OPTION') {
        handleExitGame();
      }
    };

    window.addEventListener('keydown', handleInputToExit);
    window.addEventListener('funny_gamepad_action', handleInputToExit as EventListener);
    
    return () => {
      window.removeEventListener('keydown', handleInputToExit);
      window.removeEventListener('funny_gamepad_action', handleInputToExit as EventListener);
    };
  }, [selectedGame]);

  if (selectedGame) {
    return (
      <div className="w-screen h-screen bg-black relative flex flex-col justify-between">
        <div className="absolute top-4 left-4 z-40 flex items-center gap-3">
          <button
            onClick={handleExitGame}
            className="glass-panel px-4 py-2 rounded-full border border-zinc-800 text-[10px] tracking-wider uppercase text-zinc-400 hover:text-white flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <CornerDownLeft size={12} />
            <span>Quitter le jeu (ESC)</span>
          </button>
        </div>

        <div className="flex-1 w-full h-full p-8 pt-16">
          <UniversalRuntimeRunner
            gameId={selectedGame.id}
            gameUrl={selectedGame.assets_bucket_path}
            entryPoint={selectedGame.entry_point}
            language={selectedGame.runtime}
            manifest={selectedGame.manifest}
            onTrophyUnlocked={handleTrophyUnlocked}
            onExit={handleExitGame}
            networkMode={networkMode}
            gameStateSync={onlineSyncRef.current}
            localPlayerNumber={localPlayerNumber}
          />
        </div>
      </div>
    );
  }

  if (isStudioOpen) {
    return (
      <FunnyStudio
        game={activeGame}
        onClose={handleCloseStudio}
        onTrophyUnlocked={handleTrophyUnlocked}
      />
    );
  }

  // Calculate trophies info
  const activeTrophies = trophies;
  const unlockedCount = activeTrophies.filter(t => unlockedTrophyIds.includes(t.id)).length;
  const progressPercentage = activeTrophies.length > 0 ? Math.round((unlockedCount / activeTrophies.length) * 100) : 0;
  const owned = activeGame ? isGameOwned(activeGame) : false;

  return (
    <div className="flex-1 flex flex-col justify-between text-white relative z-10 min-h-screen">
      
      {/* Top Navigation Bar with active tab links */}
      <TopBar
        username={profile.username}
        avatar={profile.avatar}
        funnyCoins={profile.funnyCoins}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenSettings={onSignOut}
        onOpenControllerMenu={() => setIsControllerModalOpen(true)}
        onOpenPowerMenu={() => setIsPowerMenuOpen(true)}
        activeControllerType={controllerType}
      />

      {/* Render selected view based on active tab */}
      {activeTab === 'store' ? (
        <StoreView
          profile={profile}
          games={games}
          onClose={() => { AudioEngine.getInstance().playSFX('select'); setActiveTab('games'); }}
          onBuyGame={async (gameId) => {
            try {
              await buyGame(gameId);      // RPC atomique (débit + possession)
              await onRefreshProfile?.();
            } catch (e) {
              alert(e instanceof Error ? e.message : "L'achat a échoué.");
            }
          }}
          onStartGame={(game) => {
            incrementPlayCount(game.id);
            setSelectedGame(game);
          }}
          onRefreshProfile={onRefreshProfile}
        />
      ) : activeTab === 'profile' ? (
        <ProfileSpace
          profile={profile}
          games={games}
          onClose={() => { AudioEngine.getInstance().playSFX('select'); setActiveTab('games'); }}
          onUpdateProfile={onUpdateProfile}
          onPublishGame={handlePublishGame}
          onDeleteGame={handleDeleteGame}
        />
      ) : (
        /* GAMES CONSOLE VIEW */
        <>
          {/* Loop background video or image fallback behind everything */}
          {activeGame && !selectedGame && (
            <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden transition-all duration-1000">
              {activeGame.video_url ? (
                <video
                  key={activeGame.id}
                  src={videoSrc || undefined}
                  poster={activeGame.background_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-cover animate-ps5-video"
                />
              ) : (
                <div key={activeGame.id} className="absolute inset-0 animate-ps5-bg">
                  <CoverImage src={activeGame.background_url} alt="" priority sizes="100vw" />
                </div>
              )}
              {/* Dynamic Aura background effect */}
              <DynamicAura gameSlug={activeGame?.slug} />

              {/* WebGL Animated Waves overlaying on top of the background image */}
              <WebGLBackground 
                className="absolute inset-0 w-full h-full pointer-events-none"
                mixBlendMode="screen"
                zIndex={15}
              />

              {/* Shading gradients to keep text readable on the left and trophies panel readable on the bottom */}
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/50 to-transparent pointer-events-none z-20" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/45 pointer-events-none z-20" />
            </div>
          )}

          {/* Console main panel content */}
          <div className="flex-1 flex flex-col justify-between px-16 py-12 select-none animate-view-enter">
            
            {/* Rail "Continuer" — jeux récemment joués par ce compte (reprise rapide) */}
            {recentGames.length > 0 && (
              <div className="flex flex-col gap-2 w-full mb-4">
                <span className="text-[9px] uppercase tracking-widest font-black text-zinc-400">Continuer</span>
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                  {recentGames.map((game) => {
                    const b = RUNTIME_BADGE[game.runtime] || { label: game.runtime.toUpperCase(), cls: 'bg-zinc-700/90 text-white' };
                    return (
                      <div
                        key={`recent-${game.id}`}
                        onClick={() => {
                          AudioEngine.getInstance().playSFX('select');
                          incrementPlayCount(game.id);
                          setSelectedGame(game);
                        }}
                        className="relative flex-shrink-0 cursor-pointer rounded-xl w-[150px] h-[84px] overflow-hidden border border-zinc-800/80 hover:border-zinc-600 transition-all group"
                      >
                        <CoverImage src={game.background_url} alt={game.title} sizes="150px" className="object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
                        <span className={`absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider shadow ${b.cls}`}>{b.label}</span>
                        <div className="absolute bottom-1.5 left-2 right-2 z-20 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow shrink-0">
                            <Play size={9} fill="currentColor" />
                          </span>
                          <h4 className="text-[9px] font-black text-white uppercase truncate">{game.title}</h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Area: PS5-style horizontal 9:16 carousel */}
            <div className="flex flex-col gap-2 w-full mt-4">
              <span className="text-[9px] uppercase tracking-widest font-black text-zinc-400">Bibliothèque</span>
              
              <div 
                ref={carouselRef}
                className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar pt-2 scroll-smooth"
              >
                {/* Skeletons pendant le chargement du catalogue (évite l'écran vide). */}
                {games.length === 0 && Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="flex-shrink-0 w-[130px] h-[195px] rounded-xl bg-zinc-900/60 border border-zinc-800/60 animate-pulse"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))}
                {games.map((game, idx) => {
                  const isFocused = idx === focusedIndex;
                  const gameOwned = isGameOwned(game);
                  
                  return (
                    <div
                      key={game.id}
                      onClick={() => {
                        setFocusedIndex(idx);
                        AudioEngine.getInstance().playSFX('select');
                      }}
                      className={`relative flex-shrink-0 cursor-pointer rounded-xl w-[130px] h-[195px] overflow-hidden transition-all duration-300 transform outline-none border-2 ${
                        isFocused
                          ? 'scale-110 border-white shadow-[0_0_25px_rgba(255,255,255,0.45),0_0_12px_rgba(0,114,206,0.3)] z-30'
                          : 'border-zinc-800/80 opacity-60 hover:opacity-90 z-20'
                      }`}
                    >
                      {/* Jaquette optimisée + repli universel ; lazy-load hors écran. */}
                      <CoverImage src={game.background_url} alt={game.title} sizes="130px" priority={isFocused} />

                      {/* Gradient overlay inside the card */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent z-10" />

                      {/* Badge console */}
                      {(() => {
                        const b = RUNTIME_BADGE[game.runtime] || { label: game.runtime.toUpperCase(), cls: 'bg-zinc-700/90 text-white' };
                        return (
                          <span className={`absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider shadow ${b.cls}`}>
                            {b.label}
                          </span>
                        );
                      })()}

                      {/* Details on the card */}
                      <div className="absolute inset-0 p-3 flex flex-col justify-end z-20">
                        {/* Bottom title */}
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-[9px] font-black text-zinc-150 uppercase tracking-wide truncate">
                            {game.title}
                          </h4>
                        </div>
                      </div>

                      {!gameOwned && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                          <Lock size={16} className="text-zinc-350" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">
                {activeGame?.title} {activeGame?.price ? `• ${activeGame.price} FC` : '• Gratuit'}
              </div>

              {/* Activity Cards Row */}
              {activeGame && (
                <div className="flex items-center gap-4 mt-3 overflow-x-auto no-scrollbar py-1">
                  {/* Card 1: Resume Play */}
                  <div className="glass-panel p-3.5 rounded-2xl w-48 border border-zinc-800/60 bg-zinc-950/20 backdrop-blur-md flex flex-col justify-between h-24 relative overflow-hidden group">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] uppercase tracking-widest font-black text-zinc-500">Activité</span>
                      <span className="text-[9.5px] font-black text-zinc-200 uppercase truncate">Reprendre la partie</span>
                      <span className="text-[8px] text-zinc-500">Joué {activeGame.play_count || 0} fois</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 z-10">
                      <button 
                        onClick={handleStartGame}
                        className="bg-white text-zinc-950 p-1.5 rounded-full hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                      >
                        <Play size={8} fill="currentColor" />
                      </button>
                      <span className="text-[7px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-900/60 px-2 py-0.5 border border-zinc-800/80 rounded-md">
                        Lancer
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Next Trophy */}
                  {activeTrophies.length > 0 && (
                    <div className="glass-panel p-3.5 rounded-2xl w-48 border border-zinc-800/60 bg-zinc-950/20 backdrop-blur-md flex flex-col justify-between h-24">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[7px] uppercase tracking-widest font-black text-zinc-500">Défi Suivant</span>
                        {(() => {
                          const nextLockedTrophy = activeTrophies.find(t => !unlockedTrophyIds.includes(t.id));
                          if (nextLockedTrophy) {
                            return (
                              <>
                                <span className="text-[9.5px] font-black text-zinc-200 uppercase truncate flex items-center gap-0.5">
                                  <TrophyIcon size={8} className="text-yellow-500" /> {nextLockedTrophy.name}
                                </span>
                                <span className="text-[8px] text-zinc-500 truncate">{nextLockedTrophy.description}</span>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <span className="text-[9.5px] font-black text-zinc-200 uppercase truncate flex items-center gap-0.5">
                                  <TrophyIcon size={8} className="text-cyan-400" /> Trophée de platine
                                </span>
                                <span className="text-[8px] text-zinc-500">Complété à 100% !</span>
                              </>
                            );
                          }
                        })()}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[7px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-900/60 px-2 py-0.5 border border-zinc-800/80 rounded-md">
                          En cours
                        </span>
                        {activeTrophies.find(t => !unlockedTrophyIds.includes(t.id)) && (
                          <span className="text-[8px] font-black text-amber-400">
                            +{activeTrophies.find(t => !unlockedTrophyIds.includes(t.id))?.coin_reward || 0} FC
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card 3: Overall Progress */}
                  <div className="glass-panel p-3.5 rounded-2xl w-48 border border-zinc-800/60 bg-zinc-950/20 backdrop-blur-md flex flex-col justify-between h-24">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] uppercase tracking-widest font-black text-zinc-500">Progression</span>
                      <span className="text-[9.5px] font-black text-zinc-200 uppercase truncate">Complétion</span>
                      <div className="w-full h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-500" 
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] font-black text-zinc-150">{progressPercentage}%</span>
                      <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-bold">
                        {unlockedCount}/{activeTrophies.length} Succès
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom-left: Active Game Meta info & Play buttons */}
            <div className="max-w-2xl mb-8 animate-fade-in flex flex-col gap-4">
              {activeGame && (
                <>
                  <h2 className="text-5xl font-black tracking-wider text-zinc-100 uppercase leading-none drop-shadow-md">
                    {activeGame.title}
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xl drop-shadow">
                    {activeGame.description}
                  </p>

                  <div className="flex items-center gap-4 mt-2">
                    {owned ? (
                      <button
                        onClick={handleStartGame}
                        className="bg-white text-zinc-950 font-black px-8 py-3.5 rounded-full flex items-center gap-2 text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform duration-300 active:scale-95 cursor-pointer"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Jouer</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyGameDirect(activeGame)}
                        className="bg-purple-600 text-white font-black px-8 py-3.5 rounded-full flex items-center gap-2 text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105 transition-transform duration-300 active:scale-95 cursor-pointer"
                      >
                        <ShoppingBag size={12} />
                        <span>Acheter {activeGame.price} FC</span>
                      </button>
                    )}
                    <button
                      onClick={handleOpenStudio}
                      className="glass-panel px-5 py-3.5 rounded-full flex items-center justify-center text-zinc-350 border border-zinc-800 hover:border-zinc-550 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Funny-Studio (Code Source)"
                    >
                      <Code size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right side stats panels */}
            {activeGame && (
              <div className="absolute bottom-20 right-16 flex flex-col gap-4 max-w-sm w-80 animate-fade-in">
                {/* Product details */}
                <div className="glass-panel p-5 rounded-2xl border border-zinc-850/60 bg-zinc-950/20 backdrop-blur-md">
                  <span className="text-[8px] uppercase tracking-widest font-black text-zinc-500">Détails du Produit</span>
                  <div className="flex justify-between items-center mt-2.5">
                    <span className="text-xs font-bold text-zinc-200">Édition Standard</span>
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-0.5">
                      <Coins size={10} />
                      {activeGame.price ? `${activeGame.price} FC` : 'Gratuit'}
                    </span>
                  </div>
                </div>

                {/* Trophy progression */}
                <div className="glass-panel p-5 rounded-2xl border border-zinc-850/60 bg-zinc-950/20 backdrop-blur-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-yellow-500 shadow-md">
                      <TrophyIcon size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-zinc-200 uppercase tracking-wide">Succès Obtenus</span>
                      <span className="text-[8px] text-zinc-500 mt-0.5">
                        Trophées: {unlockedCount} / {activeTrophies.length}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-black text-zinc-100">{progressPercentage}%</span>
                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Progrès</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Trophies list on focus (PS5 Panel styling) */}
          {activeGame && (
            <div className="glass-panel border-t border-zinc-900/60 px-16 py-5 flex items-center justify-between z-10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-blue-500 shadow-md">
                  <TrophyIcon size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider text-zinc-200">Trophées de {activeGame.title}</span>
                  <span className="text-[9px] text-zinc-500">Gagnez des trophées pour accumuler des FunnyCoins</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {activeTrophies.map(trophy => {
                  const isUnlocked = unlockedTrophyIds.includes(trophy.id);
                  let tierColor = 'text-amber-700 bg-amber-950/20 border-amber-800/30';
                  if (trophy.tier === 'silver') tierColor = 'text-zinc-400 bg-zinc-900/20 border-zinc-800/30';
                  if (trophy.tier === 'gold') tierColor = 'text-yellow-500 bg-yellow-950/20 border-yellow-800/30';
                  if (trophy.tier === 'platinum') tierColor = 'text-cyan-400 bg-cyan-950/20 border-cyan-800/30';
                  
                  return (
                    <div 
                      key={trophy.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${tierColor} ${
                        isUnlocked ? 'opacity-100 scale-102 border-opacity-70 shadow-md' : 'opacity-35'
                      }`}
                      title={`${trophy.name} : ${trophy.description} (+${trophy.coin_reward} FC)`}
                    >
                      <TrophyIcon size={12} className={isUnlocked ? 'animate-pulse' : ''} />
                      <div className="flex flex-col max-w-[120px]">
                        <span className="text-[9px] font-bold text-zinc-200 truncate leading-tight">{trophy.name}</span>
                        <span className="text-[7px] text-zinc-500 truncate leading-none mt-0.5">{trophy.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Configuration de la Manette */}
      {isControllerModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-zinc-800/80 flex flex-col gap-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            
            {controllerType === null ? (
              <>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-black tracking-wider text-zinc-100 uppercase">Configuration de la manette</h3>
                  <p className="text-xs text-zinc-400">Sélectionnez la manette à utiliser avec la Funny Station.</p>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <button
                    onClick={() => {
                      setControllerType('pc');
                      setIsControllerModalOpen(false);
                      AudioEngine.getInstance().playSFX('select');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 hover:border-blue-500/50 hover:bg-blue-950/10 hover:scale-[1.02] transition-all duration-300 text-left group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 group-hover:bg-blue-900/20 group-hover:border-blue-500/40 transition-colors">
                      <Gamepad size={24} />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide group-hover:text-blue-400 transition-colors">Manette PC / Clavier</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                        Utilisez votre clavier de PC ou connectez une manette DualSense/Xbox en USB ou Bluetooth.
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setLobbyId(`fs-${Math.random().toString(36).substring(2, 9)}`);
                      setControllerType('mobile');
                      AudioEngine.getInstance().playSFX('select');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 hover:border-emerald-500/50 hover:bg-emerald-950/10 hover:scale-[1.02] transition-all duration-300 text-left group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-900/20 group-hover:border-emerald-500/40 transition-colors">
                      <Smartphone size={24} />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide group-hover:text-emerald-400 transition-colors">Manette Portable</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                        Scannez un code QR pour transformer votre téléphone portable en manette tactile stylisée.
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setControllerType('online');
                      setOnlineMode('menu');
                      AudioEngine.getInstance().playSFX('select');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 hover:border-purple-500/50 hover:bg-purple-950/10 hover:scale-[1.02] transition-all duration-300 text-left group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 group-hover:bg-purple-900/20 group-hover:border-purple-500/40 transition-colors">
                      <Globe size={24} />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide group-hover:text-purple-400 transition-colors">Jouer en Ligne</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                        Créez ou rejoignez une partie en ligne. Chaque joueur joue depuis son propre écran.
                      </span>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setIsControllerModalOpen(false)}
                  className="mt-2 text-zinc-500 hover:text-white text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </>
            ) : controllerType === 'online' ? (
              <>
                {onlineMode === 'menu' ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Jouer en Ligne</h3>
                      <p className="text-[11px] text-zinc-400">Chaque joueur joue depuis son propre écran, où qu'il soit.</p>
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                      <button
                        onClick={async () => {
                          AudioEngine.getInstance().playSFX('select');
                          const room = GameRoom.createRoom(
                            { id: profile.id, username: profile.username },
                            activeGame.id
                          );
                          onlineRoomRef.current = room;
                          room.onPlayersChanged((players) => setOnlinePlayers(players));
                          const connected = await room.connect();
                          if (connected) {
                            const channel = room.getChannel();
                            if (channel) {
                              onlineSyncRef.current = new GameStateSync(channel, true);
                            }
                            setNetworkMode('host');
                            setLocalPlayerNumber(0);
                            setOnlineMode('lobby');
                            // Generate QR code for host's mobile controller
                            const roomCode = room.getRoomCode();
                            if (roomCode && typeof window !== 'undefined') {
                              const hostControllerUrl = `${window.location.origin}/controller?lobbyId=${roomCode}&clientPlayerId=${profile.id}`;
                              QRCode.toDataURL(hostControllerUrl, {
                                width: 256, margin: 1,
                                color: { dark: '#020617', light: '#ffffff' }
                              })
                                .then(url => setOnlineHostQrCodeUrl(url))
                                .catch(err => console.error('Erreur QR hôte en ligne:', err));
                            }
                          }
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 hover:border-purple-500/50 hover:bg-purple-950/10 hover:scale-[1.02] transition-all duration-300 text-left group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-lg font-black">+</div>
                        <div className="flex-1 flex flex-col">
                          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide group-hover:text-purple-400 transition-colors">Créer une partie</span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">Hébergez une room et invitez des joueurs</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          AudioEngine.getInstance().playSFX('select');
                          setOnlineMode('join');
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 hover:border-blue-500/50 hover:bg-blue-950/10 hover:scale-[1.02] transition-all duration-300 text-left group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-lg font-black">→</div>
                        <div className="flex-1 flex flex-col">
                          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide group-hover:text-blue-400 transition-colors">Rejoindre une partie</span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">Entrez le code de la room</span>
                        </div>
                      </button>
                    </div>
                    <button
                      onClick={() => { setControllerType(null); setOnlineMode('menu'); }}
                      className="mt-2 text-zinc-500 hover:text-white text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                    >
                      Retour
                    </button>
                  </>
                ) : onlineMode === 'join' ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Rejoindre une Partie</h3>
                      <p className="text-[11px] text-zinc-400">Entrez le code de room donné par l'hôte.</p>
                    </div>
                    <input
                      type="text"
                      value={joinRoomCode}
                      onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="EX: A3K7NP"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-center text-2xl font-mono font-black tracking-[0.4em] focus:border-purple-500/50 focus:outline-none transition-colors uppercase"
                      autoFocus
                    />
                    <div className="flex flex-col gap-3 mt-2">
                      <button
                        onClick={() => {
                          if (joinRoomCode.length >= 4) {
                            window.open(`${window.location.origin}/play/${joinRoomCode}`, '_blank');
                            setIsControllerModalOpen(false);
                          }
                        }}
                        disabled={joinRoomCode.length < 4}
                        className="w-full py-3 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-wider text-sm transition-all cursor-pointer"
                      >
                        Rejoindre
                      </button>
                      <button
                        onClick={() => setOnlineMode('menu')}
                        className="text-zinc-500 hover:text-white text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        Retour
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Room en Ligne</h3>
                      <p className="text-[11px] text-zinc-400">Partagez ce code avec vos amis pour qu'ils rejoignent.</p>
                    </div>

                    <div className="flex items-center justify-center gap-3 py-3">
                      <div className="text-3xl font-mono font-black text-purple-400 tracking-[0.3em]">
                        {onlineRoomRef.current?.getRoomCode() || '...'}
                      </div>
                      <button
                        onClick={() => {
                          const code = onlineRoomRef.current?.getRoomCode();
                          if (code) {
                            const url = `${window.location.origin}/play/${code}`;
                            navigator.clipboard.writeText(url);
                            setOnlineCopied(true);
                            setTimeout(() => setOnlineCopied(false), 2000);
                          }
                        }}
                        className="p-2 rounded-lg border border-zinc-800 hover:border-purple-500/40 text-zinc-400 hover:text-purple-400 transition-colors cursor-pointer"
                      >
                        {onlineCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                          <Users size={12} /> Joueurs en ligne
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">{onlinePlayers.length}/4</span>
                      </div>
                      {onlinePlayers.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {onlinePlayers.map((player) => {
                            const colors = PLAYER_COLORS[player.playerNumber] || PLAYER_COLORS[0];
                            return (
                              <div key={player.userId} className={`flex items-center gap-2 p-2.5 rounded-xl border ${colors.border} ${colors.bg}`}>
                                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} animate-pulse`} />
                                <div className="flex flex-col">
                                  <span className={`text-[10px] font-bold ${colors.text} uppercase tracking-wide`}>
                                    {player.username} {player.isHost ? '👑' : ''}
                                  </span>
                                  <span className="text-[8px] text-zinc-500">P{player.playerNumber + 1}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-500 text-xs font-bold bg-amber-950/40 border border-amber-800/40 px-4 py-2.5 rounded-xl justify-center">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                          <span>En attente de joueurs...</span>
                        </div>
                      )}
                    </div>

                    {/* QR Code Manette Portable de l'Hôte */}
                    <div className="w-full p-3 rounded-2xl border border-zinc-800 bg-zinc-900/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                          <Smartphone size={12} /> Manette Portable (Hôte)
                        </span>
                        <button
                          onClick={() => setShowOnlineControllerQr(!showOnlineControllerQr)}
                          className="text-[9px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          {showOnlineControllerQr ? 'Masquer' : 'Afficher QR'}
                        </button>
                      </div>
                      {showOnlineControllerQr && (
                        <div className="flex justify-center p-3 bg-white rounded-xl w-32 h-32 mx-auto shadow-lg">
                          {onlineHostQrCodeUrl ? (
                            <img src={onlineHostQrCodeUrl} alt="QR Manette Hôte" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-900 text-[10px]">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-900" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                      <button
                        onClick={() => {
                          onlineRoomRef.current?.startGame();
                          setIsControllerModalOpen(false);
                          handleStartGame();
                        }}
                        disabled={onlinePlayers.length < 2}
                        className="w-full py-3 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-wider text-sm transition-all cursor-pointer"
                      >
                        {onlinePlayers.length >= 2 ? `Lancer avec ${onlinePlayers.length} joueurs` : 'En attente d\'un 2ème joueur...'}
                      </button>
                      <button
                        onClick={() => {
                          onlineSyncRef.current?.destroy();
                          onlineRoomRef.current?.disconnect();
                          onlineRoomRef.current = null;
                          onlineSyncRef.current = null;
                          setOnlinePlayers([]);
                          setNetworkMode('local');
                          setOnlineMode('menu');
                          setControllerType(null);
                        }}
                        className="w-full py-3 rounded-full border border-red-900/30 text-red-500 hover:border-red-500/50 hover:bg-red-950/10 transition-all text-xs font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
                      >
                        Fermer la room
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : controllerType === 'pc' ? (
              <>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Gamepad size={24} />
                  </div>
                  <h3 className="text-md font-black tracking-wider text-zinc-100 uppercase mt-1">Configuration des Touches</h3>
                  <p className="text-[10px] text-zinc-400 max-w-xs leading-normal">
                    Cliquez sur une action, puis pressez n'importe quelle touche du clavier pour la réassigner.
                  </p>
                </div>

                {/* Grille de Configuration des touches de la manette */}
                <div className="grid grid-cols-2 gap-2 my-2 max-h-60 overflow-y-auto pr-1 text-left">
                  {Object.keys(ACTION_LABELS).map((actionKey) => {
                    const action = actionKey as ConsoleAction;
                    const isListening = listeningAction === action;
                    return (
                      <div key={action} className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-2.5 flex flex-col justify-between gap-1">
                        <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider">
                          {ACTION_LABELS[action]}
                        </span>
                        <button
                          onClick={() => {
                            setListeningAction(action);
                            AudioEngine.getInstance().playSFX('select');
                          }}
                          className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-mono font-bold border transition-all text-center uppercase cursor-pointer ${
                            isListening
                              ? 'bg-blue-500/20 border-blue-400 text-blue-400 animate-pulse'
                              : 'bg-zinc-900 border-zinc-850 text-zinc-350 hover:border-zinc-700 hover:text-white'
                          }`}
                        >
                          {isListening ? 'Appuyez...' : keyMapping[action] === ' ' ? 'Espace' : keyMapping[action]}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const defaults = { ...DEFAULT_KEY_MAPPING };
                      setKeyMapping(defaults);
                      saveKeyMapping(defaults);
                      AudioEngine.getInstance().playSFX('select');
                    }}
                    className="flex-1 py-2 rounded-full border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                  <button
                    onClick={() => {
                      setControllerType(null);
                      AudioEngine.getInstance().playSFX('select');
                    }}
                    className="flex-1 py-2 rounded-full border border-zinc-800 text-zinc-350 hover:border-zinc-700 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
                  >
                    Retour
                  </button>
                </div>

                <button
                  onClick={() => setIsControllerModalOpen(false)}
                  className="w-full py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Valider
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Connexion Manettes</h3>
                  <p className="text-[11px] text-zinc-400">
                    Scannez le QR Code avec chaque téléphone pour rejoindre la partie. Jusqu'à 4 joueurs simultanés.
                  </p>
                </div>

                <div className="my-3 flex justify-center p-4 bg-white rounded-2xl w-44 h-44 mx-auto shadow-lg relative overflow-hidden">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Code QR de connexion manette"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-900 text-xs">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-900 mb-2" />
                      <span>Génération...</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Users size={12} />
                      Manettes connectées
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {connectedPlayers.length}/4
                    </span>
                  </div>

                  {connectedPlayers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {connectedPlayers.map((player) => {
                        const colors = PLAYER_COLORS[player.playerNumber] || PLAYER_COLORS[0];
                        return (
                          <div
                            key={player.userId}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border ${colors.border} ${colors.bg}`}
                          >
                            <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} animate-pulse`} />
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-bold ${colors.text} uppercase tracking-wide`}>
                                {colors.label}
                              </span>
                              <span className="text-[8px] text-zinc-500 font-mono">
                                {player.userId.substring(0, 12)}...
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-500 text-xs font-bold bg-amber-950/40 border border-amber-800/40 px-4 py-2.5 rounded-xl justify-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                      <span>En attente de joueurs...</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <button
                    onClick={() => setIsControllerModalOpen(false)}
                    className="w-full py-3 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {connectedPlayers.length > 0 
                      ? `Jouer avec ${connectedPlayers.length} joueur${connectedPlayers.length > 1 ? 's' : ''}` 
                      : 'Masquer (garder la connexion)'}
                  </button>
                  <button
                    onClick={() => {
                      setControllerType(null);
                      setLobbyId('');
                      setConnectedPlayers([]);
                      AudioEngine.getInstance().playSFX('select');
                    }}
                    className="w-full py-3 rounded-full border border-red-900/30 text-red-500 hover:border-red-500/50 hover:bg-red-950/10 transition-all text-xs font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
                  >
                    Déconnecter tout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Control Center Bottom Overlay */}
      <ControlCenter
        isOpen={isControlCenterOpen}
        onClose={() => setIsControlCenterOpen(false)}
        onOpenPowerMenu={() => {
          setIsControlCenterOpen(false);
          setIsPowerMenuOpen(true);
        }}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setIsControlCenterOpen(false);
        }}
        activeGameTrophiesCount={activeTrophies.length}
        activeGameUnlockedTrophiesCount={unlockedCount}
        gamepadConnected={gamepadConnected}
        controllerType={controllerType}
      />

      {/* Power Options Contextual Menu Modal */}
      {isPowerMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-zinc-800/80 flex flex-col gap-5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                <Power size={20} />
              </div>
              <h3 className="text-md font-black tracking-widest text-zinc-150 uppercase">Options d'alimentation</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sélectionnez une option</p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { title: 'Entrer en mode repos', desc: 'Déconnecte la session et met la console en veille.' },
                { title: 'Redémarrer la FunnyStation', desc: 'Ferme tous les jeux et redémarre la console.' },
                { title: 'Éteindre la FunnyStation', desc: 'Éteint proprement la console (10s de cinématique).' }
              ].map((opt, idx) => {
                const isFocused = idx === powerFocusedIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      AudioEngine.getInstance().playSFX('select');
                      triggerPowerOption(idx);
                    }}
                    onMouseEnter={() => setPowerFocusedIndex(idx)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                      isFocused
                        ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.25)] scale-[1.02]'
                        : 'border-zinc-850 bg-zinc-900/30'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-xs font-black uppercase tracking-wide ${isFocused ? 'text-red-400' : 'text-zinc-200'}`}>
                        {opt.title}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                AudioEngine.getInstance().playSFX('select');
                setIsPowerMenuOpen(false);
              }}
              className="mt-1 text-zinc-500 hover:text-white text-[10px] font-black tracking-widest uppercase transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Shutdown Cinematic and Fallback Overlay */}
      <ShutdownScreen isShuttingDown={isShuttingDown} />
    </div>
  );
};
