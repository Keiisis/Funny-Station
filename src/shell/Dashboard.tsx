'use client';

import React, { useState, useEffect } from 'react';
import { Game, Trophy, TrophyTier } from '@/types';
import { useGamepadNavigation } from '@/hooks/useGamepadNavigation';
import { TopBar } from './TopBar';
import { GameCard } from './GameCard';
import { UniversalRuntimeRunner } from '@/kernel/UniversalRuntimeRunner';
import { AudioEngine } from '@/drivers/AudioEngine';
import { FunnyStudio } from './FunnyStudio';
import { Play, Code, Trophy as TrophyIcon, ChevronRight, CornerDownLeft, CircleAlert, Gamepad, Smartphone, Users } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import QRCode from 'qrcode';

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

interface ProfileData {
  id: string;
  username: string;
  avatar: string;
  funnyCoins: number;
}

interface DashboardProps {
  profile: ProfileData;
  onSignOut: () => void;
  onUpdateCoins: (coins: number) => void;
}

const MOCK_GAMES: Game[] = [
  {
    id: 'g1',
    title: 'Neon Runner',
    slug: 'neon-runner',
    description: 'Esquivez les obstacles néons dans cette simulation de course à haute vitesse s\'exécutant nativement en HTML5 Canvas.',
    runtime: 'js',
    entry_point: 'index.js',
    assets_bucket_path: '/games/neon-runner',
    background_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
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

export const Dashboard: React.FC<DashboardProps> = ({ profile, onSignOut, onUpdateCoins }) => {
  const [games, setGames] = useState<Game[]>(MOCK_GAMES);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [unlockedTrophyIds, setUnlockedTrophyIds] = useState<string[]>([]);
  
  const [isControllerModalOpen, setIsControllerModalOpen] = useState(false);
  const [controllerType, setControllerType] = useState<'pc' | 'mobile' | null>(null);
  const [lobbyId, setLobbyId] = useState<string>('');
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Générer le code QR localement sous forme de Data URL base64
  // Ne pas inclure userId dans l'URL — chaque téléphone génère son propre ID unique
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

  // Gérer la connexion temps réel avec les manettes mobiles (multi-joueurs)
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

    // Écouter les événements de TOUTES les manettes virtuelles
    channel.on('broadcast', { event: 'controller_state' }, ({ payload }: any) => {
      const { userId, direction } = payload;
      
      // Trouver le numéro de joueur de ce contrôleur
      const playerIdx = connectedPlayers.findIndex(p => p.userId === userId);
      const playerNumber = playerIdx >= 0 ? connectedPlayers[playerIdx].playerNumber : 0;
      
      console.log(`[Dashboard] Input P${playerNumber + 1} (${userId}): ${direction}`);
      
      // 1. Émettre l'action via CustomEvent avec l'info du joueur
      window.dispatchEvent(
        new CustomEvent('funny_gamepad_action', { 
          detail: { direction, playerNumber, userId } 
        })
      );
      
      // 2. Traduire avec le mapping clavier spécifique au joueur
      const keyMap = PLAYER_KEY_MAPS[playerNumber] || PLAYER_KEY_MAPS[0];
      const keyName = keyMap[direction];
      
      if (keyName) {
        // Dispatch on parent window
        const keydownEvt = new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true });
        window.dispatchEvent(keydownEvt);
        
        // Also dispatch into all iframes (for sandboxed games)
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
              const iframeKeydown = new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true });
              iframeWindow.dispatchEvent(iframeKeydown);
              
              setTimeout(() => {
                const iframeKeyup = new KeyboardEvent('keyup', { key: keyName, bubbles: true, cancelable: true });
                iframeWindow.dispatchEvent(iframeKeyup);
              }, 100);
            }
          } catch (e) {
            console.warn('[Dashboard] Impossible de relayer les inputs dans l\'iframe:', e);
          }
        });

        // Dispatch keyup on parent after a short delay
        setTimeout(() => {
          const keyupEvt = new KeyboardEvent('keyup', { key: keyName, bubbles: true, cancelable: true });
          window.dispatchEvent(keyupEvt);
        }, 100);
      }
    });

    // Écouter le pong pour mesurer la latence
    let lastPingTime = 0;
    channel.on('broadcast', { event: 'pong' }, ({ payload }: any) => {
      const pingDuration = Date.now() - lastPingTime;
      channel.send({
        type: 'broadcast',
        event: 'latency_update',
        payload: { userId: payload.userId, latency: pingDuration }
      });
    });

    // Mesure de latence périodique
    const pingInterval = setInterval(() => {
      lastPingTime = Date.now();
      channel.send({
        type: 'broadcast',
        event: 'ping',
        payload: {}
      });
    }, 3000);

    // Écouter les présences pour détecter tous les contrôleurs connectés
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const controllers: ConnectedPlayer[] = [];
        
        Object.entries(state).forEach(([key, presences]: [string, any]) => {
          presences.forEach((p: any) => {
            if (p.type === 'controller') {
              // Vérifier si ce joueur existe déjà dans notre liste
              const existingPlayer = connectedPlayers.find(cp => cp.userId === p.userId);
              controllers.push({
                userId: p.userId,
                playerNumber: existingPlayer ? existingPlayer.playerNumber : controllers.length,
                connectedAt: p.online_at || new Date().toISOString()
              });
            }
          });
        });
        
        // Assigner les numéros de joueur séquentiellement (max 4)
        controllers.sort((a, b) => a.connectedAt.localeCompare(b.connectedAt));
        controllers.forEach((c, idx) => {
          c.playerNumber = Math.min(idx, 3);
        });
        
        setConnectedPlayers(controllers);
        
        // Envoyer les assignations aux manettes
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
  }, [controllerType, lobbyId, profile.id, connectedPlayers]);

  const activeGame = games[focusedIndex];

  // Jouer la musique d'ambiance spécifique du jeu au focus
  useEffect(() => {
    if (!selectedGame && !isStudioOpen && activeGame) {
      AudioEngine.getInstance().playAmbientMusic(activeGame.ambient_music_url);
    }
  }, [focusedIndex, selectedGame, isStudioOpen, activeGame]);

  const handleStartGame = () => {
    AudioEngine.getInstance().playSFX('select');
    AudioEngine.getInstance().stopAmbientMusic();
    setSelectedGame(activeGame);
  };

  const handleExitGame = () => {
    AudioEngine.getInstance().playSFX('select');
    setSelectedGame(null);
  };

  const handleTrophyUnlocked = (trophyId: string) => {
    if (unlockedTrophyIds.includes(trophyId)) return;

    setUnlockedTrophyIds(prev => [...prev, trophyId]);

    // Attribuer FunnyCoins
    const trophy = MOCK_TROPHIES.find(t => t.id === trophyId);
    if (trophy) {
      onUpdateCoins(profile.funnyCoins + trophy.coin_reward);
    }

    // Déclencher l'affichage de l'overlay de trophée
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

  // Raccordement Navigation Manette / Clavier pour le Hub Principal
  useGamepadNavigation(
    games.length,
    focusedIndex,
    setFocusedIndex,
    handleStartGame,
    onSignOut,
    games.length // 1 ligne horizontale
  );

  // Écouter le bouton option de la manette pour ouvrir l'IDE
  useEffect(() => {
    const handleGamepadOption = (e: any) => {
      if (e.detail.direction === 'OPTION') {
        if (selectedGame) return; // Ne pas ouvrir en plein jeu
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

  // Écouter les entrées clavier/manette pour forcer la sortie du jeu en cours
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
    // Mode d'exécution de jeu
    return (
      <div className="w-screen h-screen bg-black relative flex flex-col justify-between">
        {/* Barre de retour en haut */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-3">
          <button
            onClick={handleExitGame}
            className="glass-panel px-4 py-2 rounded-full border border-zinc-800 text-[10px] tracking-wider uppercase text-zinc-400 hover:text-white flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <CornerDownLeft size={12} />
            <span>Quitter le jeu (Option / ESC)</span>
          </button>
        </div>

        {/* Runtime Runner */}
        <div className="flex-1 w-full h-full p-8 pt-16">
          <UniversalRuntimeRunner
            gameId={selectedGame.id}
            gameUrl={selectedGame.assets_bucket_path}
            entryPoint={selectedGame.entry_point}
            language={selectedGame.runtime}
            manifest={selectedGame.manifest}
            onTrophyUnlocked={handleTrophyUnlocked}
            onExit={handleExitGame}
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

  // Filtrer les trophées pour le jeu en cours de focus
  const activeTrophies = MOCK_TROPHIES.filter(t => t.game_id === activeGame.id);

  return (
    <div className="flex-1 flex flex-col justify-between text-white relative z-10 min-h-screen">
      {/* Barre d'état */}
      <TopBar
        username={profile.username}
        avatar={profile.avatar}
        funnyCoins={profile.funnyCoins}
        onOpenSettings={onSignOut} // Sign out / change profile as settings fallback
        onOpenControllerMenu={() => setIsControllerModalOpen(true)}
        activeControllerType={controllerType}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-end px-16 pb-20 select-none">
        
        {/* Métadonnées du jeu focus */}
        {activeGame && (
          <div className="max-w-2xl mb-12 animate-fade-in flex flex-col gap-4">
            <h2 className="text-5xl font-extrabold tracking-wide text-zinc-100 uppercase">
              {activeGame.title}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
              {activeGame.description}
            </p>

            {/* Boutons d'actions rapides */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handleStartGame}
                className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-full flex items-center gap-2 text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(255,255,255,0.25)] hover:scale-105 transition-transform duration-300 active:scale-95 cursor-pointer"
              >
                <Play size={12} fill="currentColor" />
                <span>Lancer le jeu</span>
              </button>
              <button
                onClick={handleOpenStudio}
                className="glass-panel px-6 py-3 rounded-full flex items-center gap-2 text-xs tracking-wider uppercase text-zinc-300 border border-zinc-800 hover:border-blue-500/50 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Code size={12} />
                <span>Funny-Studio (Option)</span>
              </button>
            </div>
          </div>
        )}

        {/* Carousel des jeux horizontaux */}
        <div className="flex items-end gap-6 overflow-x-auto pb-4 no-scrollbar">
          {games.map((game, idx) => (
            <GameCard
              key={game.id}
              game={game}
              isFocused={idx === focusedIndex}
              onSelect={() => {
                setFocusedIndex(idx);
                handleStartGame();
              }}
            />
          ))}
        </div>
      </div>

      {/* Section des trophées du jeu en bas (Style PS5 Panel) */}
      <div className="glass-panel border-t border-zinc-900/50 px-16 py-6 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-blue-500 shadow-md">
            <TrophyIcon size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider text-zinc-200">Trophées de {activeGame?.title}</span>
            <span className="text-[10px] text-zinc-500">Débloquez des succès pour récolter des FunnyCoins</span>
          </div>
        </div>

        {/* Liste horizontale des trophées */}
        <div className="flex items-center gap-6">
          {activeTrophies.map(trophy => {
            const isUnlocked = unlockedTrophyIds.includes(trophy.id);
            let tierBorder = 'border-amber-800/30 text-amber-700 bg-amber-950/20';
            if (trophy.tier === 'silver') tierBorder = 'border-zinc-700/30 text-zinc-500 bg-zinc-900/20';
            if (trophy.tier === 'gold') tierBorder = 'border-yellow-700/30 text-yellow-600 bg-yellow-950/20';
            if (trophy.tier === 'platinum') tierBorder = 'border-cyan-700/30 text-cyan-600 bg-cyan-950/20';
            
            return (
              <div 
                key={trophy.id}
                className={`flex items-center gap-2.5 p-2 rounded-lg border ${tierBorder} ${
                  isUnlocked ? 'opacity-100 scale-105 border-opacity-80' : 'opacity-40'
                }`}
                title={`${trophy.name} : ${trophy.description} (+${trophy.coin_reward} FC)`}
              >
                <AwardIcon tier={trophy.tier} isUnlocked={isUnlocked} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-300 tracking-wide line-clamp-1">{trophy.name}</span>
                  <span className="text-[8px] text-zinc-500 line-clamp-1">{trophy.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Configuration de la Manette */}
      {isControllerModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-zinc-800/80 flex flex-col gap-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            
            {/* Si aucun type choisi, afficher le choix */}
            {controllerType === null ? (
              <>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-black tracking-wider text-zinc-100 uppercase">Configuration de la manette</h3>
                  <p className="text-xs text-zinc-400">Sélectionnez la manette à utiliser avec la Funny Station.</p>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  {/* Option Manette PC / Clavier */}
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

                  {/* Option Manette Mobile */}
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
                </div>

                <button
                  onClick={() => setIsControllerModalOpen(false)}
                  className="mt-2 text-zinc-500 hover:text-white text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </>
            ) : controllerType === 'pc' ? (
              // Mode PC sélectionné
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
              // Mode Mobile sélectionné (QR Code & Connexion Multi-Joueurs)
              <>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-black tracking-wider text-zinc-100 uppercase">Connexion Manettes</h3>
                  <p className="text-[11px] text-zinc-400">
                    Scannez le QR Code avec chaque téléphone pour rejoindre la partie. Jusqu'à 4 joueurs simultanés.
                  </p>
                </div>

                {/* QR Code */}
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

                {/* Liste des joueurs connectés */}
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

const AwardIcon: React.FC<{ tier: TrophyTier; isUnlocked: boolean }> = ({ tier, isUnlocked }) => {
  let color = 'text-amber-600';
  if (tier === 'silver') color = 'text-zinc-400';
  if (tier === 'gold') color = 'text-yellow-400';
  if (tier === 'platinum') color = 'text-cyan-400';
  
  return (
    <div className={`p-1 rounded bg-zinc-950 border border-zinc-800 ${color}`}>
      <TrophyIcon size={12} className={isUnlocked ? 'animate-bounce' : ''} />
    </div>
  );
};
