// src/kernel/pyodide.worker.ts

// Déclaration de la fonction globale importScripts pour le compilateur TypeScript
declare function importScripts(...urls: string[]): void;

let pyodide: any = null;

// Gestionnaire d'événements pour le Web Worker
addEventListener('message', async (e: MessageEvent) => {
  const { type, codePath, codeContent, vfsData, libs } = e.data;

  if (type === 'init') {
    try {
      postMessage({ type: 'progress', progress: 10 });
      
      // Importer Pyodide
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js');
      postMessage({ type: 'progress', progress: 30 });

      // Initialiser le moteur Pyodide
      // @ts-ignore
      pyodide = await loadPyodide({
        stdout: (text: string) => {
          postMessage({ type: 'stdout', result: text });
        },
        stderr: (text: string) => {
          postMessage({ type: 'stderr', error: text });
        }
      });

      postMessage({ type: 'progress', progress: 60 });
      postMessage({ type: 'ready' });
    } catch (err: any) {
      postMessage({ type: 'error', error: `Échec d'initialisation de Pyodide: ${err.message}` });
    }
  }

  if (type === 'run') {
    if (!pyodide) {
      postMessage({ type: 'error', error: "Pyodide non initialisé" });
      return;
    }

    try {
      postMessage({ type: 'progress', progress: 70 });

      // 1. Monter les fichiers du VFS dans l'environnement virtuel Emscripten de Pyodide
      if (vfsData) {
        for (const [path, content] of Object.entries(vfsData)) {
          const parts = path.split('/');
          let currentDir = '';
          for (let i = 0; i < parts.length - 1; i++) {
            currentDir += (i === 0 ? '' : '/') + parts[i];
            try {
              pyodide.FS.mkdir(currentDir);
            } catch (dirErr) {
              // Le répertoire existe probablement déjà
            }
          }
          
          let bytes: Uint8Array;
          if (content instanceof Uint8Array) {
            bytes = content;
          } else if (typeof content === 'string') {
            bytes = new TextEncoder().encode(content);
          } else {
            bytes = new TextEncoder().encode(JSON.stringify(content));
          }
          
          pyodide.FS.writeFile(path, bytes);
        }
      }

      // 2. Charger les bibliothèques demandées (ex: numpy, matplotlib)
      if (libs && libs.length > 0) {
        postMessage({ type: 'stdout', result: `Téléchargement des dépendances Python : ${libs.join(', ')}...` });
        await pyodide.loadPackage(libs);
      }

      postMessage({ type: 'progress', progress: 90 });

      // 3. Injecter le SDK "funny_station" en Python
      pyodide.runPython(`
import js
import sys
from types import ModuleType

fs_module = ModuleType('funny_station')

def save(slot, data_dict):
    js_data = js.Object.fromEntries(data_dict.items())
    js.postMessage(js.Object.fromEntries([
        ("type", "FUNNY_BUS_SAVE"),
        ("payload", js.Object.fromEntries([
            ("slot", slot),
            ("data", js_data)
        ]))
    ]))

def load(slot):
    js.postMessage(js.Object.fromEntries([
        ("type", "FUNNY_BUS_LOAD"),
        ("payload", js.Object.fromEntries([
            ("slot", slot)
        ]))
    ]))

def unlock_trophy(trophy_id):
    js.postMessage(js.Object.fromEntries([
        ("type", "FUNNY_BUS_UNLOCK_TROPHY"),
        ("payload", js.Object.fromEntries([
            ("trophyId", trophy_id)
        ]))
    ]))

def exit():
    js.postMessage(js.Object.fromEntries([
        ("type", "FUNNY_BUS_EXIT")
    ]))

fs_module.save = save
fs_module.load = load
fs_module.unlock_trophy = unlock_trophy
fs_module.exit = exit

sys.modules['funny_station'] = fs_module
      `);

      // 4. Charger et exécuter le code du jeu
      let executableCode = codeContent;
      if (codePath && !codeContent) {
        const response = await fetch(codePath);
        executableCode = await response.text();
      }

      postMessage({ type: 'progress', progress: 100 });
      postMessage({ type: 'stdout', result: "Démarrage du script Python..." });
      
      // Exécution globale
      pyodide.runPython(executableCode);
      
      postMessage({ type: 'finished' });
    } catch (err: any) {
      postMessage({ type: 'error', error: err.message });
    }
  }

  if (type === 'inject_cheat') {
    if (pyodide) {
      try {
        const { code, enabled } = e.data.payload;
        pyodide.runPython(`
import sys
if 'funny_station' in sys.modules:
    setattr(sys.modules['funny_station'], "${code}", ${enabled ? 'True' : 'False'})
`);
      } catch (err) {
        console.error("Failed to inject cheat in Pyodide:", err);
      }
    }
  }
});
