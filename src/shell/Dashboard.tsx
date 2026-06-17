'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Game, Trophy, TrophyTier, NetworkMode, OnlinePlayer, ProfileData } from '@/types';
import { useGamepadNavigation } from '@/hooks/useGamepadNavigation';
import { TopBar } from './TopBar';
import { StoreView } from './StoreView';
import { ProfileSpace } from './ProfileSpace';
import { UniversalRuntimeRunner } from '@/kernel/UniversalRuntimeRunner';
import { AudioEngine } from '@/drivers/AudioEngine';
import { FunnyStudio } from './FunnyStudio';
import { Play, Code, Trophy as TrophyIcon, CornerDownLeft, Gamepad, Smartphone, Users, Globe, Copy, Check, Lock, Coins, ShoppingBag } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import QRCode from 'qrcode';
import { GameRoom } from '@/multiplayer/GameRoom';
import { GameStateSync } from '@/multiplayer/GameStateSync';

// Couleurs par joueur pour l'UI
const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400', label: 'Joueur 1' },
  { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-400', label: 'Joueur 2' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Joueur 3' },
  { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400', label: 'Joueur 4' },
];

// Mapping clavier par joueur (P1: Flèches, P2: ZQSD, P3: IJKL, P4: Numpad)
const PLAYER_KEY_MAPS: Record<string, string>[] = [
  { 'UP': 'ArrowUp', 'DOWN': 'ArrowDown', 'LEFT': 'ArrowLeft', 'RIGHT': 'ArrowRight', 'CONFIRM': 'Enter', 'BACK': 'Escape', 'OPTION': 'Escape', 'TRIANGLE': 'ArrowUp', 'SQUARE': ' ' },
  { 'UP': 'w', 'DOWN': 's', 'LEFT': 'a', 'RIGHT': 'd', 'CONFIRM': 'e', 'BACK': 'q', 'OPTION': 'q', 'TRIANGLE': 'w', 'SQUARE': 'f' },
  { 'UP': 'i', 'DOWN': 'k', 'LEFT': 'j', 'RIGHT': 'l', 'CONFIRM': 'o', 'BACK': 'u', 'OPTION': 'u', 'TRIANGLE': 'i', 'SQUARE': 'h' },
  { 'UP': '8', 'DOWN': '5', 'LEFT': '4', 'RIGHT': '6', 'CONFIRM': '0', 'BACK': '7', 'OPTION': '7', 'TRIANGLE': '8', 'SQUARE': '1' },
];

interface ConnectedPlayer {
  userId: string;
  playerNumber: number;
  connectedAt: string;
}

interface DashboardProps {
  profile: ProfileData;
  onSignOut: () => void;
  onUpdateProfile: (updated: ProfileData) => void;
}

const DEFAULT_GAMES: Game[] = [
  {
    id: 'g1',
    title: 'Neon Runner',
    slug: 'neon-runner',
    description: 'Esquivez les obstacles néons dans cette simulation de course à haute vitesse s\'exécutant nativement en HTML5 Canvas.',
    runtime: 'js',
    entry_point: 'index.js',
    assets_bucket_path: '/games/neon-runner',
    background_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
    video_url: 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054f4d9b3e3909bbb0079549f3e1b39&profile_id=139&oauth2_token_id=57447761',
    manifest: { screen_ratio: '16/9' },
    play_count: 24,
    rating: 4.8,
    created_at: new Date().toISOString()
  },
  {
    id: 'g2',
    title: 'PyPyodide Math Canvas',
    slug: 'pypyodide-math',
    description: 'Une démonstration de calcul matriciel en Python avec le runtime Pyodide, évaluant des trajectoires mathématiques en temps réel.',
    runtime: 'python',
    entry_point: 'main.py',
    assets_bucket_path: '/games/py-math',
    background_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1470&auto=format&fit=crop',
    video_url: 'https://player.vimeo.com/external/510850877.sd.mp4?s=d5c8d67584100b81ca20949850610c144e054c2a&profile_id=165&oauth2_token_id=57447761',
    price: 150,
    manifest: { python_libs: ['numpy'] },
    play_count: 8,
    rating: 4.5,
    created_at: new Date().toISOString()
  },
  {
    id: 'g3',
    title: 'Wasm Raytracer',
    slug: 'wasm-raytracer',
    description: 'Un moteur de rendu de raytracing de fractales écrit en C++ et compilé en binaire WebAssembly pour des performances de calcul optimales.',
    runtime: 'wasm',
    entry_point: 'game.wasm',
    assets_bucket_path: '/games/wasm-raytracer',
    background_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1364&auto=format&fit=crop',
    video_url: 'https://player.vimeo.com/external/384761655.sd.mp4?s=382a513f5cbbb726611145143d1c162629b2e697&profile_id=139&oauth2_token_id=57447761',
    price: 300,
    manifest: { maxMemoryMb: 256 },
    play_count: 15,
    rating: 4.9,
    created_at: new Date().toISOString()
  },
  {
    id: 'g4',
    title: 'Lua Adventure',
    slug: 'lua-adventure',
    description: 'Un jeu textuel d\'aventure interactif développé en Lua s\'exécutant dans l\'interpréteur Fengari.',
    runtime: 'lua',
    entry_point: 'game.lua',
    assets_bucket_path: '/games/lua-adventure',
    background_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1374&auto=format&fit=crop',
    video_url: 'https://player.vimeo.com/external/435674703.sd.mp4?s=7b31274bc6f0ef77df768f56ef830026e6ef1b71&profile_id=165&oauth2_token_id=57447761',
    manifest: {},
    play_count: 5,
    rating: 4.6,
    created_at: new Date().toISOString()
  },
  {
    id: 'g5',
    title: 'Java Retro Game',
    slug: 'java-retro',
    description: 'Un mini-jeu rétro compilé en JAR exécuté via CheerpJ dans une machine virtuelle Java complète.',
    runtime: 'java',
    entry_point: 'game.jar',
    assets_bucket_path: '/games/java-retro',
    background_url: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=1470&auto=format&fit=crop',
    video_url: 'https://player.vimeo.com/external/517602126.sd.mp4?s=f5249a9971ab60424c8789d3d3ef0c0d83296813&profile_id=165&oauth2_token_id=57447761',
    price: 500,
    manifest: {},
    play_count: 3,
    rating: 4.2,
    created_at: new Date().toISOString()
  }
];

const MOCK_TROPHIES: Trophy[] = [
  { id: 't1', game_id: 'g1', name: 'Premiers Pas', description: 'Lancer votre premier jeu sur Funny Station.', tier: 'bronze', coin_reward: 10, created_at: '' },
  { id: 't2', game_id: 'g2', name: 'Développeur Python', description: 'Exécuter un script Python isolé dans le Kernel.', tier: 'silver', coin_reward: 50, created_at: '' },
  { id: 't3', game_id: 'g2', name: 'Maître Haptique', description: 'Activer les moteurs de vibration de la DualSense.', tier: 'gold', coin_reward: 100, created_at: '' },
  { id: 't4', game_id: 'g1', name: 'Légende de la Funny Station', description: 'Débloquer tous les secrets du système.', tier: 'platinum', coin_reward: 250, created_at: '' },
  { id: 't5', game_id: 'g4', name: 'Aventurier Lua', description: 'Exécuter un script Lua avec l\'interpréteur Fengari.', tier: 'bronze', coin_reward: 15, created_at: '' },
  { id: 't6', game_id: 'g5', name: 'Machine Java', description: 'Lancer l\'émulation de la JVM CheerpJ.', tier: 'gold', coin_reward: 120, created_at: '' }
];

export const Dashboard: React.FC<DashboardProps> = ({ profile, onSignOut, onUpdateProfile }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [unlockedTrophyIds, setUnlockedTrophyIds] = useState<string[]>([]);
  
  // Tab views
  const [activeTab, setActiveTab] = useState<'games' | 'store' | 'profile'>('games');

  const [isControllerModalOpen, setIsControllerModalOpen] = useState(false);
  const [controllerType, setControllerType] = useState<'pc' | 'mobile' | 'online' | null>(null);
  const [lobbyId, setLobbyId] = useState<string>('');
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const connectedPlayersRef = useRef<ConnectedPlayer[]>([]);
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

  // Load custom community games on mount
  useEffect(() => {
    const savedGames = localStorage.getItem('funny_station_custom_games');
    if (savedGames) {
      setGames([...JSON.parse(savedGames), ...DEFAULT_GAMES]);
    } else {
      setGames(DEFAULT_GAMES);
    }
  }, []);

  // Sync custom games to localStorage when they change
  const saveCustomGames = (updatedGamesList: Game[]) => {
    const customOnly = updatedGamesList.filter(g => !DEFAULT_GAMES.some(dg => dg.id === g.id));
    localStorage.setItem('funny_station_custom_games', JSON.stringify(customOnly));
  };

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
    const controllerUrl = `${window.location.origin}/controller?lobbyId=${lobbyId}`;
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
  }, [lobbyId]);

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

    channel.on('broadcast', { event: 'controller_state' }, ({ payload }: any) => {
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
      
      const keyMap = PLAYER_KEY_MAPS[playerNumber] || PLAYER_KEY_MAPS[0];
      const keyName = keyMap[direction];
      
      if (keyName) {
        if (effectiveAction === 'down') {
          const keydownEvt = new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true });
          window.dispatchEvent(keydownEvt);
        } else {
          const keyupEvt = new KeyboardEvent('keyup', { key: keyName, bubbles: true, cancelable: true });
          window.dispatchEvent(keyupEvt);
        }
        
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
              if (effectiveAction === 'down') {
                const iframeKeydown = new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true });
                iframeWindow.dispatchEvent(iframeKeydown);
              } else {
                const iframeKeyup = new KeyboardEvent('keyup', { key: keyName, bubbles: true, cancelable: true });
                iframeWindow.dispatchEvent(iframeKeyup);
              }
            }
          } catch (e) {
            console.warn('[Dashboard] Impossible de relayer les inputs dans l\'iframe:', e);
          }
        });
      }
    });

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
              const existingPlayer = connectedPlayersRef.current.find(cp => cp.userId === p.userId);
              controllers.push({
                userId: p.userId,
                playerNumber: existingPlayer ? existingPlayer.playerNumber : controllers.length,
                connectedAt: p.online_at || new Date().toISOString()
              });
            }
          });
        });
        
        controllers.sort((a, b) => a.connectedAt.localeCompare(b.connectedAt));
        controllers.forEach((c, idx) => {
          c.playerNumber = Math.min(idx, 3);
        });
        
        setConnectedPlayers(controllers);
        
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
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString(), type: 'console' });
        }
      });

    return () => {
      clearInterval(pingInterval);
      channel.unsubscribe();
    };
  }, [controllerType, lobbyId, profile.id]);

  const activeGame = games[focusedIndex];

  // Ambient sound focusing
  useEffect(() => {
    if (!selectedGame && !isStudioOpen && activeGame && activeTab === 'games') {
      AudioEngine.getInstance().playAmbientMusic(activeGame.ambient_music_url);
    }
  }, [focusedIndex, selectedGame, isStudioOpen, activeGame, activeTab]);

  const handleStartGame = () => {
    if (!activeGame) return;
    if (!isGameOwned(activeGame)) {
      handleBuyGameDirect(activeGame);
      return;
    }

    AudioEngine.getInstance().playSFX('select');
    AudioEngine.getInstance().stopAmbientMusic();
    setSelectedGame(activeGame);
  };

  const handleExitGame = () => {
    AudioEngine.getInstance().playSFX('select');
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

  const handleTrophyUnlocked = (trophyId: string) => {
    if (unlockedTrophyIds.includes(trophyId)) return;

    setUnlockedTrophyIds(prev => [...prev, trophyId]);

    const trophy = MOCK_TROPHIES.find(t => t.id === trophyId);
    if (trophy) {
      onUpdateProfile({
        ...profile,
        funnyCoins: profile.funnyCoins + trophy.coin_reward
      });
    }

    const event = new CustomEvent('funny_station_trophy', { detail: { trophyId } });
    window.dispatchEvent(event);
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

  // Handle direct purchase from home screen
  const handleBuyGameDirect = (game: Game) => {
    if (!game.price) return;
    if (profile.funnyCoins < game.price) {
      AudioEngine.getInstance().playSFX('navigate');
      alert(`FunnyCoins insuffisants ! Il vous faut ${game.price} FC pour acheter ${game.title}. Débloquez des trophées pour en gagner !`);
      return;
    }

    AudioEngine.getInstance().playSFX('select');
    const updated: ProfileData = {
      ...profile,
      funnyCoins: profile.funnyCoins - game.price,
      ownedGames: [...profile.ownedGames, game.id]
    };
    onUpdateProfile(updated);
  };

  // Creator publish game helper
  const handlePublishGame = (newGameData: Omit<Game, 'id' | 'play_count' | 'rating' | 'created_at'>) => {
    const newGame: Game = {
      ...newGameData,
      id: `g-${Date.now()}`,
      play_count: 0,
      rating: 5.0,
      created_at: new Date().toISOString()
    };
    
    const updatedGamesList = [newGame, ...games];
    setGames(updatedGamesList);
    saveCustomGames(updatedGamesList);

    // Auto own creator's own published game
    const updatedProfile: ProfileData = {
      ...profile,
      ownedGames: [...profile.ownedGames, newGame.id]
    };
    onUpdateProfile(updatedProfile);
  };

  const handleDeleteGame = (gameId: string) => {
    const updatedGamesList = games.filter(g => g.id !== gameId);
    setGames(updatedGamesList);
    saveCustomGames(updatedGamesList);
    
    if (focusedIndex >= updatedGamesList.length) {
      setFocusedIndex(Math.max(0, updatedGamesList.length - 1));
    }
  };

  // Gamepad Navigation setup for Games tab
  useGamepadNavigation(
    activeTab === 'games' ? games.length : 0,
    focusedIndex,
    setFocusedIndex,
    handleStartGame,
    onSignOut,
    games.length
  );

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
      if (e.key === 'Escape' || e.detail?.direction === 'BACK' || e.detail?.direction === 'OPTION') {
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
  const activeTrophies = MOCK_TROPHIES.filter(t => t.game_id === activeGame?.id);
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
        activeControllerType={controllerType}
      />

      {/* Render selected view based on active tab */}
      {activeTab === 'store' ? (
        <StoreView
          profile={profile}
          games={games}
          onClose={() => { AudioEngine.getInstance().playSFX('select'); setActiveTab('games'); }}
          onBuyGame={(gameId, price) => {
            const updated: ProfileData = {
              ...profile,
              funnyCoins: profile.funnyCoins - price,
              ownedGames: [...profile.ownedGames, gameId]
            };
            onUpdateProfile(updated);
          }}
          onStartGame={(game) => {
            setSelectedGame(game);
          }}
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
          {activeGame && (
            <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden transition-all duration-1000">
              {activeGame.video_url ? (
                <video
                  key={activeGame.id}
                  src={activeGame.video_url}
                  poster={activeGame.background_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-65"
                />
              ) : (
                <div 
                  key={activeGame.id}
                  className="absolute inset-0 bg-cover bg-center opacity-50"
                  style={{ backgroundImage: `url(${activeGame.background_url})` }}
                />
              )}
              {/* Shading gradients to keep text readable on the left and trophies panel readable on the bottom */}
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30 pointer-events-none" />
            </div>
          )}

          {/* Console main panel content */}
          <div className="flex-1 flex flex-col justify-between px-16 py-12 select-none">
            
            {/* Top Area: PS5-style horizontal 9:16 carousel */}
            <div className="flex flex-col gap-2 max-w-4xl mt-4">
              <span className="text-[9px] uppercase tracking-widest font-black text-zinc-400">Bibliothèque</span>
              
              <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar pt-2">
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
                      className={`relative flex-shrink-0 cursor-pointer rounded-xl w-[108px] h-[192px] overflow-hidden transition-all duration-300 transform outline-none border-2 ${
                        isFocused
                          ? 'scale-105 border-white shadow-[0_0_20px_rgba(0,114,206,0.6)]'
                          : 'border-zinc-800/80 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <img src={game.background_url} alt={game.title} className="w-full h-full object-cover" />
                      
                      {/* Gradient overlay inside the card */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent z-10" />
                      
                      {/* Details on the card */}
                      <div className="absolute inset-0 p-3 flex flex-col justify-between z-20">
                        {/* Top runtime badge */}
                        <div className="flex justify-between items-start">
                          <span className="text-[7px] uppercase font-bold tracking-widest bg-zinc-950/80 border border-zinc-850 px-1.5 py-0.5 rounded-full text-zinc-350">
                            {game.runtime === 'js' ? 'HTML5' : game.runtime.toUpperCase()}
                          </span>
                        </div>
                        
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
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                    <Gamepad size={32} />
                  </div>
                  <h3 className="text-lg font-black tracking-wider text-zinc-100 uppercase mt-2">Mode Clavier / Manette PC Actif</h3>
                  <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                    Les entrées clavier (flèches, Entrée, Échap) et les manettes USB/Bluetooth connectées à ce PC sont actives.
                  </p>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <button
                    onClick={() => {
                      setControllerType(null);
                      AudioEngine.getInstance().playSFX('select');
                    }}
                    className="w-full py-3 rounded-full border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white transition-all text-xs font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
                  >
                    Changer de mode
                  </button>
                  <button
                    onClick={() => setIsControllerModalOpen(false)}
                    className="w-full py-3 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Terminer
                  </button>
                </div>
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
    </div>
  );
};
