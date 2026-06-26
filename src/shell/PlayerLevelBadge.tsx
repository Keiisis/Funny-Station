'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Star, Sparkles } from 'lucide-react';
import { fetchPlayerLevel, xpProgress, getTitleForLevel, xpForLevel } from '@/lib/progression';
import type { PlayerLevel } from '@/types';

interface PlayerLevelBadgeProps {
  userId: string;
  variant?: 'topbar' | 'profile' | 'inline';
}

export const PlayerLevelBadge: React.FC<PlayerLevelBadgeProps> = ({ userId, variant = 'topbar' }) => {
  const [level, setLevel] = useState<PlayerLevel | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchPlayerLevel(userId).then(setLevel).catch(console.error);
  }, [userId]);

  if (!level) return null;

  const progress = xpProgress(level.xp, level.level);
  const titleInfo = getTitleForLevel(level.level);
  const nextLevelXP = xpForLevel(level.level);
  const currentLevelXP = (level.level - 1) * 500;
  const xpInLevel = level.xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: titleInfo.color }}>
        Nv.{level.level}
      </span>
    );
  }

  if (variant === 'topbar') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800/40 rounded-xl border border-zinc-700/20">
        <div className="flex items-center gap-1">
          <Star size={12} style={{ color: titleInfo.color }} className="fill-current" />
          <span className="text-[10px] font-black text-white">Nv.{level.level}</span>
        </div>
        <div className="w-16 h-1.5 bg-zinc-700/40 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%`, backgroundColor: titleInfo.color }}
          />
        </div>
      </div>
    );
  }

  // variant === 'profile'
  return (
    <div className="bg-zinc-800/40 border border-zinc-700/20 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl"
          style={{ backgroundColor: titleInfo.color + '22', color: titleInfo.color }}
        >
          {level.level}
        </div>
        <div>
          <p className="text-sm font-black text-white">{titleInfo.title}</p>
          <p className="text-[10px] text-zinc-500">Niveau {level.level}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-bold text-zinc-300">{level.xp.toLocaleString()} XP</p>
          <p className="text-[10px] text-zinc-500">{xpInLevel} / {xpNeeded}</p>
        </div>
      </div>

      {/* XP bar */}
      <div className="w-full h-3 bg-zinc-700/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 relative"
          style={{ width: `${progress * 100}%`, backgroundColor: titleInfo.color }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 rounded-full" />
        </div>
      </div>
      <p className="text-[9px] text-zinc-600 mt-1.5 text-right">
        {(xpNeeded - xpInLevel).toLocaleString()} XP pour le niveau {level.level + 1}
      </p>
    </div>
  );
};

/** Popup Level Up — à afficher quand l'utilisateur monte de niveau. */
export const LevelUpPopup: React.FC<{ level: number; title: string; onClose: () => void }> = ({ level, title, onClose }) => {
  const titleInfo = getTitleForLevel(level);

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none">
      <div className="bg-zinc-900/95 border border-zinc-700/50 rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-50 pointer-events-auto" onClick={onClose}>
        <Sparkles size={40} style={{ color: titleInfo.color }} className="mx-auto mb-3 animate-spin" />
        <h2 className="text-2xl font-black text-white mb-1">LEVEL UP !</h2>
        <p className="text-4xl font-black mb-2" style={{ color: titleInfo.color }}>{level}</p>
        <p className="text-sm font-bold text-zinc-300">Tu es maintenant <span style={{ color: titleInfo.color }}>{title}</span></p>
        <p className="text-[10px] text-zinc-500 mt-3">Clique pour fermer</p>
      </div>
    </div>
  );
};
