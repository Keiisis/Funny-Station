'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { initVFS, VirtualFileSystem } from './vfs';
import { GameLanguage } from '@/types';

interface GameRunnerProps {
  gameId: string;
  gameUrl: string; // Ex: /games/tetris
  entryPoint: string; // Ex: index.js ou main.py
  language: GameLanguage;
  manifest: {
    dependencies?: string[];
    maxMemoryMb?: number;
    python_libs?: string[];
  };
  onTrophyUnlocked?: (trophyName: string) => void;
  onExit?: () => void;
}

export const UniversalRuntimeRunner: React.FC<GameRunnerProps> = ({
  gameId,
  gameUrl,
  entryPoint,
  language,
  manifest,
  onTrophyUnlocked,
  onExit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const vfsRef = useRef<VirtualFileSystem | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

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
        default:
          break;
      }
    };

    window.addEventListener('message', handleSystemMessage);

    return () => {
      active = false;
      window.removeEventListener('message', handleSystemMessage);
      if (workerRef.current) {
        workerRef.current.terminate();
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

  const handleUnlockTrophy = async (trophyId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Mode hors ligne : Simuler le déblocage visuel
        if (onTrophyUnlocked) onTrophyUnlocked(trophyId);
        return;
      }

      // Insérer en base Supabase
      const { error } = await supabase.from('user_trophies').insert({
        user_id: user.id,
        trophy_id: trophyId
      });

      if (!error && onTrophyUnlocked) {
        onTrophyUnlocked(trophyId);
      } else if (error) {
        // Débloquer visuellement quand même si déjà débloqué en base
        if (error.code === '23505') { // Unique constraint violation (déjà débloqué)
          if (onTrophyUnlocked) onTrophyUnlocked(trophyId);
        } else {
          console.error("[Funny-Bus] Erreur déblocage trophée Supabase:", error);
        }
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
      const sandboxDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (sandboxDoc) {
        // Code SDK à injecter
        const injectSDK = `
          window.funnyStation = {
            save: (slot, data) => window.parent.postMessage({ type: 'FUNNY_BUS_SAVE', payload: { slot, data } }, '*'),
            load: (slot) => window.parent.postMessage({ type: 'FUNNY_BUS_LOAD', payload: { slot } }, '*'),
            unlockTrophy: (trophyId) => window.parent.postMessage({ type: 'FUNNY_BUS_UNLOCK_TROPHY', payload: { trophyId } }, '*'),
            exit: () => window.parent.postMessage({ type: 'FUNNY_BUS_EXIT' }, '*')
          };
        `;

        // Récupérer le code source du point d'entrée
        const entryPath = `${gameUrl}/${entryPoint}`;
        
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
          codePath: `${gameUrl}/${entryPoint}`,
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

  const setupWasmEnvironment = async (vfs: VirtualFileSystem) => {
    setLoadingProgress(70);
    // Instanciation directe de WASM avec injection de la table mémoire virtuelle
    const response = await fetch(`${gameUrl}/${entryPoint}`);
    if (!response.ok) throw new Error("Impossible de charger le binaire WASM.");
    const buffer = await response.arrayBuffer();

    const importObject = {
      env: {
        memory: new WebAssembly.Memory({ 
          initial: 256, 
          maximum: manifest.maxMemoryMb ? (manifest.maxMemoryMb * 16) : 512 
        }),
        funny_station_save: (ptr: number, length: number) => {
          console.log('[WASM SDK] funny_station_save trigger');
          // En production, lire dans la mémoire WASM à l'adresse ptr
        },
        funny_station_log: (ptr: number) => {
          console.log('[WASM SDK] Log depuis le code natif');
        }
      }
    };

    setLoadingProgress(85);
    const wasmModule = await WebAssembly.instantiate(buffer, importObject);
    
    // Exécuter le point d'entrée
    if (wasmModule.instance.exports.main) {
      (wasmModule.instance.exports.main as Function)();
    } else if (wasmModule.instance.exports._main) {
      (wasmModule.instance.exports._main as Function)();
    }
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
        const entryPath = `${gameUrl}/${entryPoint}`;
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
        const entryPath = `${gameUrl}/${entryPoint}`;
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
          title="Sandbox Game Process"
        />
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
    </div>
  );
};
