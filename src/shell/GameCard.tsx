'use client';

import React from 'react';
import { Game } from '@/types';
import { CoverImage } from './CoverImage';
import { Play, Gamepad2, Star } from 'lucide-react';

interface GameCardProps {
  game: Game;
  isFocused: boolean;
  onSelect: () => void;
}

// Étiquette + couleur de la console/runtime (affichée en badge sur la jaquette).
const RUNTIME_BADGE: Record<string, { label: string; cls: string }> = {
  gba:     { label: 'GBA',  cls: 'bg-emerald-500/90 text-white' },
  nes:     { label: 'NES',  cls: 'bg-red-500/90 text-white' },
  snes:    { label: 'SNES', cls: 'bg-violet-500/90 text-white' },
  psp:     { label: 'PSP',  cls: 'bg-fuchsia-500/90 text-white' },
  js:      { label: 'JEU',  cls: 'bg-sky-500/90 text-white' },
  wasm:    { label: 'WASM', cls: 'bg-orange-500/90 text-white' },
  python:  { label: 'PY',   cls: 'bg-blue-500/90 text-white' },
  lua:     { label: 'LUA',  cls: 'bg-indigo-500/90 text-white' },
  java:    { label: 'JAVA', cls: 'bg-rose-500/90 text-white' },
  android: { label: 'APK',  cls: 'bg-lime-500/90 text-zinc-900' },
};

export const GameCard: React.FC<GameCardProps> = ({ game, isFocused, onSelect }) => {
  const badge = RUNTIME_BADGE[game.runtime] || { label: game.runtime.toUpperCase(), cls: 'bg-zinc-700/90 text-white' };
  const rating = typeof game.rating === 'number' ? game.rating : 0;

  return (
    <div
      onClick={onSelect}
      className={`relative flex-shrink-0 cursor-pointer rounded-xl overflow-hidden transition-all duration-300 transform outline-none ${
        isFocused
          ? 'w-36 h-[256px] scale-105 ring-2 ring-white shadow-[0_0_28px_rgba(0,114,206,0.65)] z-10'
          : 'w-32 h-[228px] opacity-85 hover:opacity-100 ring-1 ring-zinc-800'
      }`}
    >
      {/* Jaquette plein cadre (optimisée + repli universel si format exotique) */}
      <CoverImage
        src={game.background_url}
        alt={game.title}
        sizes="(max-width: 768px) 40vw, 160px"
        priority={isFocused}
      />

      {/* Dégradé bas pour la lisibilité du texte (n'assombrit que le tiers inférieur) */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

      {/* Badge console (haut-gauche) */}
      <div className="absolute top-2 left-2 z-20">
        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shadow-md ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Indicateur "lancer" (haut-droite, au focus) */}
      {isFocused && (
        <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-white text-zinc-950 flex items-center justify-center animate-bounce shadow-lg">
          <Play size={10} fill="currentColor" />
        </div>
      )}

      {/* Infos bas */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 flex flex-col gap-1">
        <h3 className={`text-xs font-bold tracking-wide truncate ${isFocused ? 'text-white' : 'text-zinc-200'}`}>
          {game.title}
        </h3>
        <div className="flex items-center gap-2">
          {rating > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
              <Star size={9} fill="currentColor" className="text-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
          <span className="text-[8px] text-zinc-400 flex items-center gap-1">
            {game.play_count > 0 ? (
              <>
                <Gamepad2 size={10} className="text-zinc-400 inline" />
                {game.play_count} parties
              </>
            ) : 'Nouveau'}
          </span>
        </div>
      </div>
    </div>
  );
};
