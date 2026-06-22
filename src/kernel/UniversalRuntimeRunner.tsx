'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { unlockTrophyByKey } from '@/lib/db';
import { initVFS, VirtualFileSystem } from './vfs';
import { MemorySwapManager } from './swap';
import { GameLanguage, NetworkMode, TrophyTier } from '@/types';
import { GameStateSync } from '@/multiplayer/GameStateSync';
import { GamepadController } from '../drivers/GamepadController';
import { loadKeyMapping, ConsoleAction } from '@/utils/inputMapping';
import { Zap, Check, ArrowLeft } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';

interface Cheat {
  id: string;
  gameSlug: string;
  name: string;
  description: string;
  code: string;
}

const AVAILABLE_CHEATS: Cheat[] = [
  { id: 'c-neon-god', gameSlug: 'neon-runner', name: 'Invincibilité (God Mode)', description: 'Rend le vaisseau complètement invincible aux obstacles.', code: 'god_mode' },
  { id: 'c-neon-score', gameSlug: 'neon-runner', name: 'Score Multiplier x10', description: 'Multiplie tous les points de score obtenus par 10.', code: 'score_x10' },
  { id: 'c-jackie-lives', gameSlug: 'jackie-chan', name: 'Vies Infinies', description: 'Bloque le compteur de vies à 99.', code: 'infinite_lives' },
  { id: 'c-jackie-inv', gameSlug: 'jackie-chan', name: 'Invincibilité Stunt', description: 'Jackie ne subit plus de dégâts des ennemis.', code: 'god_mode' },
  { id: 'c-ray-speed', gameSlug: 'wasm-raytracer', name: 'Moteur Turbo', description: 'Accélère considérablement la vitesse de rendu.', code: 'turbo_render' },
  { id: 'c-horror-ammo', gameSlug: 'top-down-horror', name: 'Munitions Infinies', description: 'Vos armes ne se vident jamais.', code: 'infinite_ammo' }
];

/** Donnée transmise à l'UI quand un trophée est débloqué (pour l'overlay). */
export interface TrophyUnlockPayload {
  id: string;
  key: string;
  name: string;
  description: string;
  tier: TrophyTier;
}

/**
 * Résolution de l'URL d'un asset de jeu.
 *
 * Chargement DIRECT (navigateur → R2/CDN), y compris cross-origin :
 *  - Proxyer les gros fichiers (centaines de Mo) par Vercel échoue (limites plateforme
 *    → 502), donc on ne proxy pas.
 *  - COEP `credentialless` (cf. next.config) autorise le cross-origin sans CORP.
 *  - Prérequis : l'hôte R2 doit renvoyer le CORS (Access-Control-Allow-Origin). Le
 *    domaine r2.dev ne le fait pas → utiliser le Cloudflare Worker fourni (ou un
 *    domaine personnalisé R2) comme base d'URL des jeux.
 *
 * Les chemins same-origin passent inchangés.
 */
function resolveAssetUrl(url: string): string {
  return url;
}

interface GameRunnerProps {
  gameId: string;
  gameUrl: string;
  entryPoint: string;
  language: GameLanguage;
  manifest: {
    dependencies?: string[];
    maxMemoryMb?: number;
    python_libs?: string[];
    screen_ratio?: string;
  };
  onTrophyUnlocked?: (trophy: TrophyUnlockPayload) => void;
  onExit?: () => void;
  // Online multiplayer props
  networkMode?: NetworkMode;
  gameStateSync?: GameStateSync | null;
  localPlayerNumber?: number;
}

export const UniversalRuntimeRunner: React.FC<GameRunnerProps> = ({
  gameId,
  gameUrl,
  entryPoint,
  language,
  manifest,
  onTrophyUnlocked,
  onExit,
  networkMode = 'local',
  gameStateSync = null,
  localPlayerNumber = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const vfsRef = useRef<VirtualFileSystem | null>(null);
  const wasmRafRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const [gameSlug, setGameSlug] = useState<string>('');
  const [ownedCheats, setOwnedCheats] = useState<string[]>([]);
  const [activeCheats, setActiveCheats] = useState<Record<string, boolean>>({});
  const [isCheatPanelOpen, setIsCheatPanelOpen] = useState(false);
  const [focusedCheatIndex, setFocusedCheatIndex] = useState(0);
  const [androidNativeApp, setAndroidNativeApp] = useState<boolean>(false);
  const [selectedDemoGame, setSelectedDemoGame] = useState<string>('');

  useEffect(() => {
    let active = true;
    import('@/lib/db').then(({ fetchGameById }) => {
      fetchGameById(gameId).then((g) => {
        if (active && g) {
          setGameSlug(g.slug);
        }
      });
    });
    return () => { active = false; };
  }, [gameId]);

  useEffect(() => {
    let active = true;
    const loadUserCheats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && active) {
        const stored = localStorage.getItem(`funny_station_cheats_${user.id}`);
        if (stored) {
          try {
            setOwnedCheats(JSON.parse(stored));
          } catch (e) {}
        }
      }
    };
    loadUserCheats();
    return () => { active = false; };
  }, []);

  const currentCheatPacks = AVAILABLE_CHEATS.filter(c => c.gameSlug === gameSlug && ownedCheats.includes(c.id));

  const injectCheatCode = (code: string, enabled: boolean) => {
    console.log(`[Cheat Injector] Injecting cheat: ${code} -> ${enabled}`);

    // 1. JS IFrame
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'FUNNY_BUS_CHEAT_STATUS',
          payload: { code, enabled }
        }, '*');

        const win = iframeRef.current.contentWindow;
        if (code === 'god_mode') {
          (win as any).godMode = enabled;
          (win as any).infiniteHealth = enabled;
        } else if (code === 'score_x10') {
          (win as any).scoreMultiplier = enabled ? 10 : 1;
        } else if (code === 'infinite_ammo') {
          (win as any).infiniteAmmo = enabled;
        } else if (code === 'infinite_lives') {
          (win as any).infiniteLives = enabled;
        }
      } catch (e) {}
    }

    // 2. Python Web Worker
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'inject_cheat',
        payload: { code, enabled }
      });
    }

    // 3. Emulator Cheats
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'EMULATOR_CHEAT_INJECT',
        payload: { code, enabled }
      }, '*');
    }
  };

  // Keyboard C & Gamepad Triangle panel toggle
  useEffect(() => {
    const handleInput = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        setIsCheatPanelOpen(prev => !prev);
      }
    };

    const handleGamepadInput = (e: CustomEvent<{ direction: string; action?: string }>) => {
      if (e.detail.action === 'up') return;
      if (e.detail.direction === 'TRIANGLE') {
        AudioEngine.getInstance().playSFX('select');
        setIsCheatPanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleInput);
    window.addEventListener('funny_gamepad_action', handleGamepadInput as EventListener);
    return () => {
      window.removeEventListener('keydown', handleInput);
      window.removeEventListener('funny_gamepad_action', handleGamepadInput as EventListener);
    };
  }, []);

  // Cheat Panel Navigation
  useEffect(() => {
    if (!isCheatPanelOpen || currentCheatPacks.length === 0) return;

    const handleNav = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', -0.1);
        setFocusedCheatIndex(prev => (prev - 1 + currentCheatPacks.length) % currentCheatPacks.length);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', 0.1);
        setFocusedCheatIndex(prev => (prev + 1) % currentCheatPacks.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        const cheat = currentCheatPacks[focusedCheatIndex];
        const nextState = !activeCheats[cheat.code];
        
        setActiveCheats(prev => ({ ...prev, [cheat.code]: nextState }));
        injectCheatCode(cheat.code, nextState);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        setIsCheatPanelOpen(false);
      }
    };

    const handleGamepadNav = (e: CustomEvent<{ direction: string; action?: string }>) => {
      if (e.detail.action === 'up') return;
      const dir = e.detail.direction;

      if (dir === 'UP') {
        AudioEngine.getInstance().playSFX('navigate', -0.1);
        setFocusedCheatIndex(prev => (prev - 1 + currentCheatPacks.length) % currentCheatPacks.length);
      } else if (dir === 'DOWN') {
        AudioEngine.getInstance().playSFX('navigate', 0.1);
        setFocusedCheatIndex(prev => (prev + 1) % currentCheatPacks.length);
      } else if (dir === 'CONFIRM') {
        AudioEngine.getInstance().playSFX('select');
        const cheat = currentCheatPacks[focusedCheatIndex];
        const nextState = !activeCheats[cheat.code];
        
        setActiveCheats(prev => ({ ...prev, [cheat.code]: nextState }));
        injectCheatCode(cheat.code, nextState);
      } else if (dir === 'BACK') {
        AudioEngine.getInstance().playSFX('select');
        setIsCheatPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleNav, { capture: true });
    window.addEventListener('funny_gamepad_action', handleGamepadNav as EventListener);
    return () => {
      window.removeEventListener('keydown', handleNav, { capture: true });
      window.removeEventListener('funny_gamepad_action', handleGamepadNav as EventListener);
    };
  }, [isCheatPanelOpen, focusedCheatIndex, currentCheatPacks, activeCheats]);

  useEffect(() => {
    // Mettre en pause le GamepadController global pour que Funny Station ne capte plus les touches
    const gamepad = GamepadController.getInstance();
    gamepad.pause();

    // Activer l'injection clavier pour GBA, PSP ou JS standard, mais pas pour Unity (entryPoint finit par .html)
    const isUnityGame = language === 'js' && entryPoint.endsWith('.html');
    const shouldInjectKeyboard = language === 'gba' || language === 'psp' || language === 'psx' || (language === 'js' && !isUnityGame);
    gamepad.enableKeyboardInjection(shouldInjectKeyboard);

    return () => {
      // Désactiver l'injection clavier et reprendre le GamepadController global à la sortie du jeu
      gamepad.enableKeyboardInjection(false);
      gamepad.resume();
    };
  }, [language, entryPoint]);

  useEffect(() => {
    let active = true;

    const startProcess = async () => {
      try {
        setLoadingProgress(10);

        // 1. Initialiser le système de fichiers virtuel (VFS)
        const vfs = await initVFS(gameId);
        vfsRef.current = vfs;
        
        // Tenter de restaurer les sauvegardes depuis Supabase si connecté
        setLoadingProgress(25);
        try {
          await vfs.syncFromCloud(gameId);
        } catch (e) {
          console.log("[Kernel] Mode hors-ligne / Non authentifié. Sauvegarde locale active.");
        }
        setLoadingProgress(40);

        // 2. Lancer le runtime correspondant
        if (language === 'js') {
          await setupJsEnvironment(vfs);
        } else if (language === 'python') {
          await setupPythonEnvironment(vfs);
        } else if (language === 'wasm') {
          await setupWasmEnvironment(vfs);
        } else if (language === 'lua') {
          await setupLuaEnvironment(vfs);
        } else if (language === 'java') {
          await setupJavaEnvironment(vfs);
        } else if (language === 'gba') {
          await setupGbaEnvironment(vfs);
        } else if (language === 'psp') {
          await setupPspEnvironment(vfs);
        } else if (language === 'psx') {
          await setupPsxEnvironment(vfs);
        } else if (language === 'android') {
          await setupAndroidEnvironment(vfs);
        } else {
          throw new Error(`Le langage '${language}' n'est pas encore supporté par le noyau.`);
        }

        if (active) {
          setIsReady(true);
          setLoadingProgress(100);
        }
      } catch (err: any) {
        if (active) {
          setErrorMsg(err.message || "Erreur de chargement du jeu");
          console.error(err);
        }
      }
    };

    startProcess();

    // 3. Gestion du bus de communication sécurisé (Funny-Bus)
    const handleSystemMessage = async (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (!type) return;

      switch (type) {
        case 'FUNNY_BUS_SAVE':
          await handleSave(payload.slot, payload.data);
          break;
        case 'FUNNY_BUS_LOAD':
          await handleLoad(payload.slot);
          break;
        case 'FUNNY_BUS_UNLOCK_TROPHY':
          await handleUnlockTrophy(payload.trophyId);
          break;
        case 'FUNNY_BUS_EXIT':
          if (onExit) onExit();
          break;
        case 'FUNNY_BUS_GAME_READY':
          console.log('[Kernel] Le jeu est prêt. Focus sur le canvas.');
          if (iframeRef.current) {
            iframeRef.current.focus();
            iframeRef.current.contentWindow?.postMessage({ type: 'FUNNY_STATION_FOCUS' }, '*');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleSystemMessage);

    // === ONLINE MULTIPLAYER BRIDGE ===
    let cleanupSync: (() => void) | null = null;

    if (gameStateSync && networkMode === 'host') {
      // HOST: Listen for GAME_STATE_EXPORT from game iframe and broadcast to clients
      const handleGameExport = (event: MessageEvent) => {
        if (event.data?.type === 'GAME_STATE_EXPORT' && event.data.state) {
          gameStateSync.broadcastState(event.data.state);
        }
      };
      window.addEventListener('message', handleGameExport);

      // HOST: Forward remote player inputs to the game iframe
      const unsubInput = gameStateSync.onInputReceived((input) => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'REMOTE_PLAYER_INPUT',
            direction: input.direction,
            playerNumber: input.playerNumber,
            action: input.action || 'down'
          }, '*');
        }
      });

      cleanupSync = () => {
        window.removeEventListener('message', handleGameExport);
        unsubInput();
      };
    }

    if (gameStateSync && networkMode === 'client') {
      // CLIENT: Receive game state from host and forward to game iframe
      const unsubState = gameStateSync.onStateReceived((state) => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'GAME_STATE_IMPORT',
            state
          }, '*');
        }
      });

      // CLIENT: Forward local game inputs to the host via sync
      const handleClientInput = (event: MessageEvent) => {
        if (event.data?.type === 'GAME_INPUT') {
          gameStateSync.sendInput(
            event.data.direction,
            event.data.playerNumber ?? localPlayerNumber,
            '',
            event.data.action || 'down'
          );
        }
      };
      window.addEventListener('message', handleClientInput);

      cleanupSync = () => {
        unsubState();
        window.removeEventListener('message', handleClientInput);
      };
    }

    return () => {
      active = false;
      window.removeEventListener('message', handleSystemMessage);
      if (cleanupSync) cleanupSync();
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (wasmRafRef.current) {
        cancelAnimationFrame(wasmRafRef.current);
      }
    };
  }, [gameId, language]);

  // --- LOGIQUE SAUVEGARDE & CHARGEMENT ---

  const handleSave = async (slot: string, data: any) => {
    if (!vfsRef.current) return;
    try {
      // Écriture locale immédiate
      const content = typeof data === 'string' ? data : JSON.stringify(data);
      await vfsRef.current.writeFile(`saves/${slot}.json`, content);
      console.log(`[Funny-Bus] Fichier écrit localement: saves/${slot}.json`);

      // Écriture cloud Supabase asynchrone (Non bloquante pour le jeu)
      vfsRef.current.syncToCloud(gameId);
    } catch (err) {
      console.error("[Funny-Bus] Échec de la sauvegarde:", err);
    }
  };

  const handleLoad = async (slot: string) => {
    if (!vfsRef.current) return;
    try {
      const content = await vfsRef.current.readFile(`saves/${slot}.json`);
      let data = null;
      if (content) {
        const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }
      }

      // Renvoyer les données à l'iframe ou au worker
      const loadResponse = {
        type: 'FUNNY_BUS_LOAD_RESPONSE',
        payload: { slot, data }
      };

      if (language === 'js' && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(loadResponse, '*');
      } else if (language === 'python' && workerRef.current) {
        workerRef.current.postMessage(loadResponse);
      }
    } catch (err) {
      console.error("[Funny-Bus] Échec du chargement :", err);
    }
  };

  // Le paramètre est la CLÉ STABLE du trophée (ex: 'first_steps'), pas un UUID.
  const handleUnlockTrophy = async (trophyKey: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Invité non authentifié : déblocage visuel uniquement (pas de persistance).
        onTrophyUnlocked?.({ id: trophyKey, key: trophyKey, name: 'Succès débloqué', description: '', tier: 'bronze' });
        return;
      }

      // Résolution clé → trophée + insertion réelle (le trigger SQL crédite les coins).
      const trophy = await unlockTrophyByKey(user.id, gameId, trophyKey);
      if (trophy) {
        onTrophyUnlocked?.({
          id: trophy.id,
          key: trophy.trophy_key,
          name: trophy.name,
          description: trophy.description,
          tier: trophy.tier,
        });
      } else {
        console.warn(`[Funny-Bus] Trophée inconnu pour ce jeu: '${trophyKey}'`);
      }
    } catch (err) {
      console.error("[Funny-Bus] Exception déblocage trophée:", err);
    }
  };

  // --- INITIALISATIONS DES RUNTIMES ---

  const setupJsEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(60);
    // JS standard isolé dans une IFrame avec Content Security Policy stricte
    if (iframeRef.current) {
      const entryPath = resolveAssetUrl(`${gameUrl}/${entryPoint}`);
      
      if (entryPoint.endsWith('.html')) {
        // Pour les points d'entrée HTML (ex: WebGL Unity), on charge directement l'URL
        iframeRef.current.src = entryPath;
        
        const injectBridge = () => {
          try {
            if (iframeRef.current?.contentWindow) {
              (iframeRef.current.contentWindow as any).funnyStation = {
                save: (slot: string, data: any) => window.parent.postMessage({ type: 'FUNNY_BUS_SAVE', payload: { slot, data } }, '*'),
                load: (slot: string) => window.parent.postMessage({ type: 'FUNNY_BUS_LOAD', payload: { slot } }, '*'),
                unlockTrophy: (trophyId: string) => window.parent.postMessage({ type: 'FUNNY_BUS_UNLOCK_TROPHY', payload: { trophyId } }, '*'),
                exit: () => window.parent.postMessage({ type: 'FUNNY_BUS_EXIT' }, '*'),
                networkMode: networkMode,
                playerNumber: localPlayerNumber
              };
            }
          } catch (e) {
            console.warn("[Kernel] Impossible d'injecter funnyStation directement dans l'iframe HTML:", e);
          }
        };

        iframeRef.current.onload = injectBridge;
      } else {
        const sandboxDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (sandboxDoc) {
          // Code SDK à injecter
          const injectSDK = `
            window.funnyStation = {
              save: (slot, data) => window.parent.postMessage({ type: 'FUNNY_BUS_SAVE', payload: { slot, data } }, '*'),
              load: (slot) => window.parent.postMessage({ type: 'FUNNY_BUS_LOAD', payload: { slot } }, '*'),
              unlockTrophy: (trophyId) => window.parent.postMessage({ type: 'FUNNY_BUS_UNLOCK_TROPHY', payload: { trophyId } }, '*'),
              exit: () => window.parent.postMessage({ type: 'FUNNY_BUS_EXIT' }, '*'),
              networkMode: '${networkMode}',
              playerNumber: ${localPlayerNumber}
            };
          `;

          sandboxDoc.open();
          sandboxDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Funny Sandbox</title>
                <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: *;">
                <script>${injectSDK}</script>
                <script src="${entryPath}" type="module" defer></script>
              </head>
              <body style="margin: 0; overflow: hidden; background: #000; color: #fff; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div id="game-canvas-container" style="width:100%; height:100%;"></div>
              </body>
            </html>
          `);
          sandboxDoc.close();
        }
      }
    }
  };

  const setupPythonEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(55);
    
    // Initialiser le Web Worker Pyodide
    workerRef.current = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' });
    
    // Envoyer la commande d'initialisation
    workerRef.current.postMessage({ type: 'init' });

    workerRef.current.onmessage = async (e) => {
      const { type, progress, result, error, slot } = e.data;

      if (type === 'progress') {
        setLoadingProgress(40 + Math.floor(progress * 0.5));
      } else if (type === 'ready') {
        // Récupérer tous les fichiers du VFS
        const vfsData = await vfs.getAllFiles();

        // Envoi du script d'entrée au worker pour exécution
        workerRef.current?.postMessage({
          type: 'run',
          codePath: resolveAssetUrl(`${gameUrl}/${entryPoint}`),
          vfsData,
          libs: manifest.python_libs || []
        });
      } else if (type === 'stdout') {
        setConsoleLogs(prev => [...prev, `[Python] ${result}`]);
      } else if (type === 'stderr') {
        setConsoleLogs(prev => [...prev, `[Python Error] ${error}`]);
      } else if (type === 'error') {
        setErrorMsg(`Python Runtime Error: ${error}`);
      } else if (type === 'FUNNY_BUS_SAVE') {
        // Rediriger vers notre handler local
        await handleSave(e.data.payload.slot, e.data.payload.data);
      } else if (type === 'FUNNY_BUS_LOAD') {
        await handleLoad(e.data.payload.slot);
      } else if (type === 'FUNNY_BUS_UNLOCK_TROPHY') {
        await handleUnlockTrophy(e.data.payload.trophyId);
      } else if (type === 'FUNNY_BUS_EXIT') {
        if (onExit) onExit();
      }
    };
  };

  const setupWasmEnvironment = async (_vfs: VirtualFileSystem) => {
    setLoadingProgress(70);
    // Chargement du binaire via le gestionnaire mémoire/swap : cache RAM + IndexedDB (LRU).
    // Les relances du jeu repartent du cache local sans re-télécharger.
    const swap = new MemorySwapManager(gameId, manifest.maxMemoryMb ?? 128);
    await swap.init();
    const bytes = await swap.loadAsset(`wasm/${entryPoint}`, resolveAssetUrl(`${gameUrl}/${entryPoint}`));
    // Copie dans un ArrayBuffer contigu (overload BufferSource de WebAssembly.instantiate).
    const buffer = bytes.slice().buffer as ArrayBuffer;

    // SDK natif réel : le module peut journaliser et lire/écrire dans sa mémoire linéaire.
    let exportedMemory: WebAssembly.Memory | null = null;
    const readCString = (ptr: number) => {
      if (!exportedMemory) return '';
      const bytes = new Uint8Array(exportedMemory.buffer, ptr);
      let end = 0;
      while (bytes[end] !== 0 && end < 4096) end++;
      return new TextDecoder().decode(new Uint8Array(exportedMemory.buffer, ptr, end));
    };

    const importObject: WebAssembly.Imports = {
      env: {
        // Permet aux modules compilés (C/Rust) d'utiliser les fonctions trigonométriques.
        sinf: (x: number) => Math.sin(x),
        cosf: (x: number) => Math.cos(x),
        funny_station_log: (ptr: number) => console.log('[WASM]', readCString(ptr)),
      },
    };

    setLoadingProgress(85);
    const wasmModule = await WebAssembly.instantiate(buffer, importObject);
    const exports = wasmModule.instance.exports as Record<string, unknown>;

    if (exports.memory instanceof WebAssembly.Memory) {
      exportedMemory = exports.memory;
    }

    setLoadingProgress(100);

    // Cas 1 — module graphique : exporte `render(w,h,t)` + `memory`.
    // Le runtime lit les pixels calculés par le WASM et les peint sur le canvas.
    if (typeof exports.render === 'function' && exportedMemory) {
      const render = exports.render as (w: number, h: number, t: number) => void;
      const memory = exportedMemory;
      const canvas = document.getElementById('wasm-canvas') as HTMLCanvasElement | null;
      const ctx = canvas?.getContext('2d');
      const W = 480, H = 320;
      if (canvas) { canvas.width = W; canvas.height = H; }

      const start = performance.now();
      const frame = () => {
        const t = (performance.now() - start) / 1000;
        render(W, H, t);
        if (ctx) {
          const pixels = new Uint8ClampedArray(memory.buffer, 0, W * H * 4);
          ctx.putImageData(new ImageData(pixels, W, H), 0, 0);
        }
        wasmRafRef.current = requestAnimationFrame(frame);
      };
      frame();
      return;
    }

    // Cas 2 — module classique : point d'entrée main()/_main().
    if (typeof exports.main === 'function') (exports.main as () => void)();
    else if (typeof exports._main === 'function') (exports._main as () => void)();
  };

  const setupLuaEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(60);
    if (iframeRef.current) {
      const sandboxDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (sandboxDoc) {
        const injectSDK = `
          window.funnyStation = {
            save: (slot, data) => window.parent.postMessage({ type: 'FUNNY_BUS_SAVE', payload: { slot, data } }, '*'),
            load: (slot) => window.parent.postMessage({ type: 'FUNNY_BUS_LOAD', payload: { slot } }, '*'),
            unlockTrophy: (trophyId) => window.parent.postMessage({ type: 'FUNNY_BUS_UNLOCK_TROPHY', payload: { trophyId } }, '*'),
            exit: () => window.parent.postMessage({ type: 'FUNNY_BUS_EXIT' }, '*')
          };
        `;
        const entryPath = resolveAssetUrl(`${gameUrl}/${entryPoint}`);
        sandboxDoc.open();
        sandboxDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Funny Sandbox Lua</title>
              <script>${injectSDK}</script>
              <script src="https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js"></script>
              <script type="application/lua" src="${entryPath}" defer></script>
            </head>
            <body style="margin: 0; overflow: hidden; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh;">
              <div id="game-canvas-container" style="color: #60a5fa; font-family: monospace; font-size: 14px; text-align: center; padding-top: 50px;">
                Exécution du script Lua (Fengari)...
              </div>
            </body>
          </html>
        `);
        sandboxDoc.close();
      }
    }
  };

  const setupJavaEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(60);
    if (iframeRef.current) {
      const sandboxDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (sandboxDoc) {
        const injectSDK = `
          window.funnyStation = {
            save: (slot, data) => window.parent.postMessage({ type: 'FUNNY_BUS_SAVE', payload: { slot, data } }, '*'),
            load: (slot) => window.parent.postMessage({ type: 'FUNNY_BUS_LOAD', payload: { slot } }, '*'),
            unlockTrophy: (trophyId) => window.parent.postMessage({ type: 'FUNNY_BUS_UNLOCK_TROPHY', payload: { trophyId } }, '*'),
            exit: () => window.parent.postMessage({ type: 'FUNNY_BUS_EXIT' }, '*')
          };
        `;
        const entryPath = resolveAssetUrl(`${gameUrl}/${entryPoint}`);
        sandboxDoc.open();
        sandboxDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Funny Sandbox Java</title>
              <script>${injectSDK}</script>
              <script src="https://cjrtnc.cheerpj.com/loader.js"></script>
            </head>
            <body style="margin: 0; overflow: hidden; background: #000; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100vw; height: 100vh; font-family: sans-serif;">
              <div id="game-canvas-container" style="color: #f87171; font-family: monospace; font-size: 14px; text-align: center; margin-bottom: 20px;">
                Initialisation du Runtime Java (CheerpJ)...
              </div>
              <script>
                cheerpjInit().then(() => {
                  document.getElementById('game-canvas-container').innerText = "CheerpJ initialisé. Lancement de : ${entryPoint}...";
                  cheerpjCreateDisplay(800, 600);
                  cheerpjRunJar("/app${entryPath}");
                });
              </script>
            </body>
          </html>
        `);
        sandboxDoc.close();
      }
    }
  };

  const setupGbaEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(70);
    if (iframeRef.current) {
      const romPath = resolveAssetUrl(`${gameUrl}/${entryPoint}`);
      iframeRef.current.src = `/games/gba-runner.html?rom=${encodeURIComponent(romPath)}`;
      
      const injectBridge = () => {
        try {
          if (iframeRef.current?.contentWindow) {
            (iframeRef.current.contentWindow as any).funnyStation = {
              save: (slot: string, data: any) => window.parent.postMessage({ type: 'FUNNY_BUS_SAVE', payload: { slot, data } }, '*'),
              load: (slot: string) => window.parent.postMessage({ type: 'FUNNY_BUS_LOAD', payload: { slot } }, '*'),
              unlockTrophy: (trophyId: string) => window.parent.postMessage({ type: 'FUNNY_BUS_UNLOCK_TROPHY', payload: { trophyId } }, '*'),
              exit: () => window.parent.postMessage({ type: 'FUNNY_BUS_EXIT' }, '*'),
              networkMode: networkMode,
              playerNumber: localPlayerNumber
            };
          }
        } catch (e) {
          console.warn("[Kernel] Impossible d'injecter funnyStation directement dans l'iframe GBA:", e);
        }
      };

      iframeRef.current.onload = injectBridge;
    }
  };

  const setupPspEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(70);
    if (iframeRef.current) {
      const romPath = resolveAssetUrl(`${gameUrl}/${entryPoint}`);
      iframeRef.current.src = `/games/psp-runner.html?rom=${encodeURIComponent(romPath)}`;
      
      const injectBridge = () => {
        try {
          if (iframeRef.current?.contentWindow) {
            (iframeRef.current.contentWindow as any).funnyStation = {
              save: (slot: string, data: any) => window.parent.postMessage({ type: 'FUNNY_BUS_SAVE', payload: { slot, data } }, '*'),
              load: (slot: string) => window.parent.postMessage({ type: 'FUNNY_BUS_LOAD', payload: { slot } }, '*'),
              unlockTrophy: (trophyId: string) => window.parent.postMessage({ type: 'FUNNY_BUS_UNLOCK_TROPHY', payload: { trophyId } }, '*'),
              exit: () => window.parent.postMessage({ type: 'FUNNY_BUS_EXIT' }, '*'),
              networkMode: networkMode,
              playerNumber: localPlayerNumber
            };
          }
        } catch (e) {
          console.warn("[Kernel] Impossible d'injecter funnyStation directement dans l'iframe PSP:", e);
        }
      };

      iframeRef.current.onload = injectBridge;
    }
  };

  const setupPsxEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(70);
    if (iframeRef.current) {
      const romPath = resolveAssetUrl(`${gameUrl}/${entryPoint}`);
      iframeRef.current.src = `/games/psx-runner.html?rom=${encodeURIComponent(romPath)}`;

      const injectBridge = () => {
        try {
          if (iframeRef.current?.contentWindow) {
            (iframeRef.current.contentWindow as any).funnyStation = {
              save: (slot: string, data: any) => window.parent.postMessage({ type: 'FUNNY_BUS_SAVE', payload: { slot, data } }, '*'),
              load: (slot: string) => window.parent.postMessage({ type: 'FUNNY_BUS_LOAD', payload: { slot } }, '*'),
              unlockTrophy: (trophyId: string) => window.parent.postMessage({ type: 'FUNNY_BUS_UNLOCK_TROPHY', payload: { trophyId } }, '*'),
              exit: () => window.parent.postMessage({ type: 'FUNNY_BUS_EXIT' }, '*'),
              networkMode: networkMode,
              playerNumber: localPlayerNumber
            };
          }
        } catch (e) {
          console.warn("[Kernel] Impossible d'injecter funnyStation directement dans l'iframe PS1:", e);
        }
      };

      iframeRef.current.onload = injectBridge;
    }
  };

  const setupAndroidEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(70);
    if (entryPoint.endsWith('.apk') || entryPoint === 'game.apk') {
      setAndroidNativeApp(true);
    } else if (iframeRef.current) {
      const gamePath = resolveAssetUrl(`${gameUrl}/${entryPoint}`);
      iframeRef.current.src = gamePath;
    }
    setLoadingProgress(100);
  };

  // ── PONT D'ENTRÉE UNIFIÉ POUR LES ÉMULATEURS (GBA / PSP / PS1) ──────────────
  // On utilise l'API d'entrée NATIVE d'EmulatorJS (simulateInput) via postMessage.
  // C'est bien plus fiable que des KeyboardEvents synthétiques, souvent ignorés par
  // l'émulateur car non « trusted ». L'iframe (xxx-runner.html) reçoit l'index RetroPad
  // et pilote directement le cœur — exactement comme le gamepad tactile d'EmulatorJS.
  useEffect(() => {
    if (language !== 'gba' && language !== 'psp' && language !== 'psx') return;

    let currentMapping = loadKeyMapping();
    const handleMappingChange = (e: Event) => { currentMapping = (e as CustomEvent).detail; };
    window.addEventListener('funny_station_mapping_changed', handleMappingChange);

    // ConsoleAction -> index RetroPad (standard libretro).
    //  GBA (Nintendo)      : A = RetroPad A(8), B = RetroPad B(0).
    //  PSP / PS1 (Sony)    : Croix=B(0), Rond=A(8), Carré=Y(1), Triangle=X(9).
    const RETROPAD: Record<'gba' | 'psp' | 'psx', Record<ConsoleAction, number>> = {
      gba: { UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 8, B: 0, X: 8, Y: 0, L: 10, R: 11, START: 3, SELECT: 2 },
      psp: { UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 0, B: 8, X: 1, Y: 9, L: 10, R: 11, START: 3, SELECT: 2 },
      psx: { UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 0, B: 8, X: 1, Y: 9, L: 10, R: 11, START: 3, SELECT: 2 },
    };
    const indexMap = RETROPAD[language as 'gba' | 'psp' | 'psx'];

    const handleKey = (e: KeyboardEvent) => {
      const action = (Object.keys(currentMapping) as ConsoleAction[]).find(
        (act) => currentMapping[act] === e.key
      );
      if (action === undefined) return;
      const index = indexMap[action];
      if (index === undefined) return;
      e.preventDefault();
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'FUNNY_EMU_INPUT', index, pressed: e.type === 'keydown' },
        '*'
      );
    };

    window.addEventListener('keydown', handleKey, { capture: true });
    window.addEventListener('keyup', handleKey, { capture: true });
    return () => {
      window.removeEventListener('funny_station_mapping_changed', handleMappingChange);
      window.removeEventListener('keydown', handleKey, { capture: true });
      window.removeEventListener('keyup', handleKey, { capture: true });
    };
  }, [language]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center rounded-lg overflow-hidden border border-zinc-800">
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white z-50">
          <div className="text-2xl font-bold tracking-widest mb-4 text-blue-500">FUNNY STATION</div>
          <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="text-xs text-zinc-400 animate-pulse">Chargement du Kernel ({language.toUpperCase()})...</div>
          {errorMsg && <div className="mt-4 text-red-500 text-sm bg-red-950/40 px-3 py-1.5 rounded border border-red-900/50">{errorMsg}</div>}
        </div>
      )}

      {language === 'js' && (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none bg-black"
          sandbox="allow-scripts allow-same-origin"
          allow="gamepad"
          title="Sandbox Game Process"
        />
      )}

      {language === 'gba' && (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none bg-black"
          sandbox="allow-scripts allow-same-origin"
          title="GBA Emulator Process"
        />
      )}

      {language === 'psp' && (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none bg-black"
          sandbox="allow-scripts allow-same-origin"
          title="PSP Emulator Process"
        />
      )}

      {language === 'psx' && (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none bg-black"
          sandbox="allow-scripts allow-same-origin"
          title="PS1 Emulator Process"
        />
      )}

      {language === 'android' && !androidNativeApp && (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none bg-black"
          sandbox="allow-scripts allow-same-origin"
          allow="gamepad"
          title="Android Web Runtime Process"
        />
      )}

      {language === 'android' && androidNativeApp && (
        <div className="w-full h-full bg-zinc-950 flex flex-col relative text-white font-sans overflow-hidden">
          {/* Simulation Notification Overlay */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-zinc-950 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-amber-400 flex items-center gap-1.5 backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 fill-zinc-950" />
            <span>Mode Sandbox Android Actif (APK Natif)</span>
          </div>

          {/* Simulated Android Device Screen */}
          <div className="flex-1 w-full h-full flex flex-col relative">
            {selectedDemoGame ? (
              <div className="w-full h-full flex flex-col relative">
                {/* Close/Back Button */}
                <button 
                  onClick={() => setSelectedDemoGame('')}
                  className="absolute top-4 left-4 z-40 p-2 rounded-xl bg-black/70 hover:bg-black/90 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-lg"
                  title="Retour à l'accueil"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                
                {/* Game IFrame */}
                <iframe
                  src={
                    selectedDemoGame === 'flappy'
                      ? 'https://mario.moe/flappybird/'
                      : selectedDemoGame === '2048'
                      ? 'https://gabrielecirulli.github.io/2048/'
                      : 'https://wayou.github.io/t-rex-runner/'
                  }
                  className="flex-1 w-full h-full border-none bg-black"
                  sandbox="allow-scripts allow-same-origin"
                  title="Android Simulated Game"
                />
              </div>
            ) : (
              /* Android Home Screen */
              <div 
                className="w-full h-full flex flex-col justify-between p-8 relative bg-cover bg-center"
                style={{
                  backgroundImage: `radial-gradient(circle, rgba(2,6,23,0.65) 0%, rgba(2,6,23,0.95) 100%), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop')`
                }}
              >
                {/* Clock Widget */}
                <div className="flex flex-col items-center mt-12 animate-in fade-in slide-in-from-top-6 duration-300">
                  <span className="text-6xl font-extralight tracking-wide text-zinc-100">
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-zinc-400 uppercase tracking-widest mt-2 font-bold font-mono">
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>

                {/* Grid of Apps */}
                <div className="flex-1 flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                  <div className="grid grid-cols-3 gap-12 max-w-md w-full">
                    {/* Flappy Bird */}
                    <div 
                      onClick={() => { AudioEngine.getInstance().playSFX('select'); setSelectedDemoGame('flappy'); }}
                      className="flex flex-col items-center gap-3 group cursor-pointer"
                    >
                      <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-yellow-450 to-amber-550 border border-yellow-350 flex items-center justify-center shadow-[0_10px_20px_rgba(245,158,11,0.25)] transition-all transform group-hover:scale-110 active:scale-95 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                        <span className="text-4xl">🐤</span>
                      </div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200 transition-colors">Flappy Bird</span>
                    </div>

                    {/* 2048 */}
                    <div 
                      onClick={() => { AudioEngine.getInstance().playSFX('select'); setSelectedDemoGame('2048'); }}
                      className="flex flex-col items-center gap-3 group cursor-pointer"
                    >
                      <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-orange-450 to-red-550 border border-orange-350 flex items-center justify-center shadow-[0_10px_20px_rgba(239,68,68,0.25)] transition-all transform group-hover:scale-110 active:scale-95 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                        <span className="text-2xl font-black text-white tracking-tighter">2048</span>
                      </div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200 transition-colors">2048</span>
                    </div>

                    {/* Chrome Dino */}
                    <div 
                      onClick={() => { AudioEngine.getInstance().playSFX('select'); setSelectedDemoGame('dino'); }}
                      className="flex flex-col items-center gap-3 group cursor-pointer"
                    >
                      <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-zinc-700 to-zinc-850 border border-zinc-600 flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-all transform group-hover:scale-110 active:scale-95 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <span className="text-4xl">🦖</span>
                      </div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200 transition-colors">T-Rex Run</span>
                    </div>
                  </div>
                </div>

                {/* Footer instructions */}
                <div className="text-center text-[9px] text-zinc-550 font-mono uppercase tracking-wider animate-pulse">
                  Sélectionnez un jeu tactile Android pour démarrer
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {language === 'python' && (
        <div className="w-full h-full flex flex-col bg-zinc-950 p-4 font-mono text-xs text-green-400 overflow-y-auto">
          <div className="text-zinc-500 border-b border-zinc-900 pb-2 mb-2 flex justify-between">
            <span>🚀 PIPELINE RUNTIME PYTHON (PYODIDE ACTIVE)</span>
            <span className="text-blue-500">Isolé</span>
          </div>
          <div className="flex-1 space-y-1">
            {consoleLogs.map((log, idx) => (
              <div key={idx} className={log.includes('Error') ? 'text-red-400' : ''}>
                {log}
              </div>
            ))}
          </div>
          <canvas id="python-canvas" className="hidden" />
        </div>
      )}

      {language === 'wasm' && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4 font-mono text-xs text-zinc-400">
          <div className="mb-4">Binaire WASM instancié avec succès.</div>
          <canvas id="wasm-canvas" className="w-full h-full bg-black max-w-lg max-h-96 rounded border border-zinc-800" />
        </div>
      )}

      {/* Active Cheat HUD */}
      {Object.values(activeCheats).some(v => v) && (
        <div className="absolute top-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1 bg-blue-950/80 border border-blue-500/50 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.3)] backdrop-blur-md animate-pulse">
          <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
          <span className="text-[10px] font-bold tracking-wider text-blue-200 uppercase">Cheats Actifs</span>
        </div>
      )}

      {/* Cheat Panel Overlay */}
      {isCheatPanelOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-zinc-950/95 to-blue-950/95 border border-blue-500/30 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8),0_0_15px_rgba(59,130,246,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 animate-fade-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500 animate-pulse" />
                <h3 className="font-bold text-sm tracking-wide text-zinc-100 uppercase">Injecteur de Cheats</h3>
              </div>
              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Touche C / Triangle</span>
            </div>
            
            {/* Cheat List */}
            <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
              {currentCheatPacks.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                  <p className="text-xs">Aucun code de triche possédé pour ce jeu.</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Achetez des packs de cheats dans le FunnyStore.</p>
                </div>
              ) : (
                currentCheatPacks.map((cheat, index) => {
                  const isFocused = index === focusedCheatIndex;
                  const isActive = !!activeCheats[cheat.code];
                  return (
                    <div
                      key={cheat.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isFocused
                          ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isFocused ? 'text-blue-400' : 'text-zinc-200'}`}>
                            {cheat.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {cheat.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-center">
                        <div 
                          className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                            isActive ? 'bg-blue-500' : 'bg-zinc-700'
                          }`}
                        >
                          <div 
                            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 flex items-center justify-center ${
                              isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          >
                            {isActive && <Check className="w-3 h-3 text-blue-600 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Navigation Info / Footer */}
            <div className="px-5 py-3 border-t border-zinc-900 bg-zinc-950/80 flex justify-between items-center text-[10px] text-zinc-500">
              <span>{currentCheatPacks.length > 0 ? "▲▼ Naviguer • ENTRÉE Activer" : ""}</span>
              <span>ÉCHAP pour fermer</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
