'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Game } from '@/types';
import { Play, Save, Code, Terminal, Trophy, X, RefreshCw } from 'lucide-react';
import { initVFS } from '@/kernel/vfs';

interface FunnyStudioProps {
  game: Game;
  onClose: () => void;
  onTrophyUnlocked: (trophyId: string) => void;
}

const DEFAULT_CODE_TEMPLATES: { [key: string]: string } = {
  'js': `// === Neon Runner (Funny Station JS Game) ===
// Vous pouvez modifier le code et cliquer sur "Enregistrer"

const canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.getElementById('game-canvas-container').appendChild(canvas);
const ctx = canvas.getContext('2d');

let particles = [];
let frame = 0;
let score = 0;

// Config
const color = '#00f2ff';

function loop() {
  ctx.fillStyle = 'rgba(2, 6, 23, 0.2)'; // Trailing effect
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Générer des météores
  if (frame % 8 === 0) {
    particles.push({
      x: Math.random() * canvas.width,
      y: 0,
      size: 4 + Math.random() * 6,
      speed: 3 + Math.random() * 5,
    });
  }
  
  // Dessiner vagues néon
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < canvas.width; i += 10) {
    const y = canvas.height - 100 + Math.sin(i * 0.005 + frame * 0.05) * 20;
    if (i === 0) ctx.moveTo(i, y);
    else ctx.lineTo(i, y);
  }
  ctx.stroke();

  // Dessiner & bouger particules
  ctx.fillStyle = '#ff007f';
  particles.forEach((p, idx) => {
    p.y += p.speed;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Supprimer si hors écran
    if (p.y > canvas.height) {
      particles.splice(idx, 1);
      score += 10;
      
      // Débloquer un trophée si score atteint 200
      if (score === 200) {
        window.funnyStation.unlockTrophy('t1');
      }
    }
  });

  // Affichage Score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Courier';
  ctx.fillText('SCORE: ' + score, 40, 60);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Atteignez 200 points pour débloquer le trophée!', 40, 90);

  frame++;
  requestAnimationFrame(loop);
}

loop();
`,
  'python': `# === PyPyodide Math (Funny Station Python Script) ===
# Modifiez et enregistrez pour lancer l'exécution NumPy

import numpy as np
import funny_station

print("Initialisation du moteur de calcul matriciel...")

# Créer une matrice aléatoire 3x3
matrix_a = np.random.randint(1, 10, size=(3, 3))
matrix_b = np.random.randint(1, 10, size=(3, 3))

print("Matrice A :")
print(matrix_a)
print("\\nMatrice B :")
print(matrix_b)

# Produit matriciel
result = np.dot(matrix_a, matrix_b)
print("\\nProduit matriciel (A x B) :")
print(result)

# Débloquer un trophée depuis le script Python!
print("\\n[Python] Déblocage du trophée Silver via le SDK...")
funny_station.unlock_trophy('t2')
`,
  'wasm': `// Code Source C++ (Compilation WASM simulée)
#include <iostream>
#include <emscripten.h>

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void main() {
        std::cout << "Initialisation du Raytracer WASM..." << std::endl;
        std::cout << "Rendu fractal complété (Calcul physique ultra-rapide)." << std::endl;
    }
}
`
};

export const FunnyStudio: React.FC<FunnyStudioProps> = ({ game, onClose, onTrophyUnlocked }) => {
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  useEffect(() => {
    const loadSavedCode = async () => {
      try {
        const vfs = await initVFS(game.id);
        const savedCode = await vfs.readFile(game.entry_point);
        if (savedCode) {
          setCode(typeof savedCode === 'string' ? savedCode : new TextDecoder().decode(savedCode));
          setConsoleOutput([`[System] Code chargé depuis le VFS IndexedDB pour ${game.entry_point}.`]);
        } else {
          // Charger le template par défaut
          const template = DEFAULT_CODE_TEMPLATES[game.runtime] || '';
          setCode(template);
          setConsoleOutput([`[System] Initialisation avec le modèle par défaut.`]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSavedCode();
  }, [game]);

  const handleSave = async () => {
    setIsSaving(true);
    setConsoleOutput(prev => [...prev, `[System] Sauvegarde dans IndexedDB...`]);
    try {
      const vfs = await initVFS(game.id);
      await vfs.writeFile(game.entry_point, code);
      
      // Tenter la synchronisation cloud
      try {
        await vfs.syncToCloud(game.id);
        setConsoleOutput(prev => [...prev, `[System] Succès ! Synchronisé avec le Cloud Supabase.`]);
      } catch (e) {
        setConsoleOutput(prev => [...prev, `[System] Enregistré localement (IndexedDB).`]);
      }

      setIsSaving(false);
    } catch (err: any) {
      setConsoleOutput(prev => [...prev, `[Error] Échec de la sauvegarde: ${err.message}`]);
      setIsSaving(false);
    }
  };

  const handleRunTestTrophy = () => {
    // Permet de tester le trigger de trophée manuellement dans l'IDE
    const trophyId = game.runtime === 'js' ? 't1' : game.runtime === 'python' ? 't2' : 't3';
    onTrophyUnlocked(trophyId);
    setConsoleOutput(prev => [...prev, `[System] Déclenchement de test pour le trophée ${trophyId}...`]);
  };

  return (
    <div className="w-screen h-screen bg-[#090d16] text-white flex flex-col font-sans select-none relative z-30">
      
      {/* Barre supérieure de l'IDE */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-[#0d1527] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
            <Code size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wide">FUNNY-STUDIO (IDE)</span>
            <span className="text-[10px] text-zinc-400">Éditeur de Script : {game.title} &gt; {game.entry_point}</span>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunTestTrophy}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold border border-zinc-700 flex items-center gap-1.5 transition-all duration-300"
            title="Débloquer un trophée pour ce jeu"
          >
            <Trophy size={12} className="text-yellow-500" />
            <span>Trophée Test</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
              isSaving 
                ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
            }`}
          >
            {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            <span>Enregistrer (Hot-Reload)</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-red-950/40 border border-transparent hover:border-red-900/50 text-zinc-400 hover:text-red-400 transition-all duration-300"
            title="Quitter l'IDE"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Grid de l'IDE : Monaco à gauche, Console à droite */}
      <div className="flex-1 flex overflow-hidden">
        {/* Éditeur de code Monaco (70% de largeur) */}
        <div className="w-[70%] h-full relative">
          <Editor
            height="100%"
            theme="vs-dark"
            language={game.runtime === 'js' ? 'javascript' : game.runtime === 'python' ? 'python' : 'cpp'}
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on'
            }}
          />
        </div>

        {/* Console & logs (30% de largeur) */}
        <div className="w-[30%] h-full border-l border-zinc-800 bg-[#070b13] flex flex-col justify-between">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#090d16] border-b border-zinc-800 text-zinc-400 font-mono text-[10px] uppercase">
            <Terminal size={12} />
            <span>Console & Logs Système</span>
          </div>

          {/* Logs scrollable */}
          <div className="flex-1 p-4 font-mono text-xs text-zinc-300 overflow-y-auto space-y-1.5 select-text selection:bg-blue-600 selection:text-white">
            {consoleOutput.map((log, index) => (
              <div key={index} className={log.includes('[Error]') ? 'text-red-400' : log.includes('[System]') ? 'text-blue-400' : ''}>
                {log}
              </div>
            ))}
          </div>

          {/* Instructions rapides bas de console */}
          <div className="p-4 bg-[#090d16] border-t border-zinc-900 text-[10px] text-zinc-500 leading-normal font-sans">
            <h4 className="font-semibold text-zinc-400 mb-1">Guide du Funny-SDK :</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <code className="text-blue-400 font-mono">window.funnyStation.save(slot, data)</code> : sauvegarde des données.
              </li>
              <li>
                <code className="text-blue-400 font-mono">window.funnyStation.load(slot)</code> : charge des données du VFS.
              </li>
              <li>
                <code className="text-blue-400 font-mono">window.funnyStation.unlockTrophy(id)</code> : débloque un trophée.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
