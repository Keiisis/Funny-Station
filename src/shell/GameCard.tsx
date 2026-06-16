'use client';

import React from 'react';
import { Game } from '@/types';
import { Play, Gamepad2 } from 'lucide-react';

interface GameCardProps {
  game: Game;
  isFocused: boolean;
  onSelect: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, isFocused, onSelect }) => {
  // Déterminer la couleur du badge de langage
  let langBadgeColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  if (game.runtime === 'wasm') {
    langBadgeColor = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
  } else if (game.runtime === 'python') {
    langBadgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  } else if (game.runtime === 'lua') {
    langBadgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  } else if (game.runtime === 'java') {
    langBadgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
  }

  return (
    <div
      onClick={onSelect}
      className={`relative flex-shrink-0 cursor-pointer rounded-xl overflow-hidden transition-all duration-300 transform outline-none ${
        isFocused
          ? 'w-44 h-56 scale-105 border-2 border-white shadow-[0_0_20px_rgba(0,114,206,0.6)]'
          : 'w-40 h-52 opacity-55 hover:opacity-85 border border-zinc-800'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(2,6,23,0.95) 100%)'
      }}
    >
      {/* Overlay dégradé */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />

      {/* Rendu visuel */}
      <div className="w-full h-full flex flex-col justify-between p-4 relative z-10">
        {/* Top elements */}
        <div className="flex justify-between items-start">
          <span className={`text-[8px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${langBadgeColor}`}>
            {game.runtime === 'js' ? 'HTML5' : game.runtime.toUpperCase()}
          </span>
          {isFocused && (
            <div className="w-6 h-6 rounded-full bg-white text-zinc-950 flex items-center justify-center animate-bounce shadow-md">
              <Play size={10} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Info du bas */}
        <div className="flex flex-col gap-0.5">
          <h3 className={`text-xs font-bold tracking-wide truncate ${isFocused ? 'text-white' : 'text-zinc-300'}`}>
            {game.title}
          </h3>
          <span className="text-[8px] text-zinc-500 flex items-center gap-1">
            {game.play_count > 0 ? (
              <>
                <Gamepad2 size={10} className="text-zinc-500 inline" />
                <span>{game.play_count} parties</span>
              </>
            ) : 'Nouveau'}
          </span>
        </div>
      </div>

      {/* Arrière-plan de la carte (Image si existante, sinon gradient d'ambiance) */}
      {game.background_url ? (
        <img
          src={game.background_url}
          alt={game.title}
          className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-500 hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/20 via-violet-950/10 to-zinc-950 opacity-40" />
      )}
    </div>
  );
};
