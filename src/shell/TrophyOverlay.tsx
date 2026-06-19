'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Trophy, Award } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';
import { TrophyTier } from '@/types';

interface TrophyData {
  id: string;
  name: string;
  description: string;
  tier: TrophyTier;
}

export const TrophyOverlay: React.FC = () => {
  const pathname = usePathname();
  const [activeTrophy, setActiveTrophy] = useState<TrophyData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // L'événement transporte désormais les infos complètes du trophée (résolu en DB).
    const handleTrophyUnlock = (e: Event) => {
      const trophy = (e as CustomEvent<{ trophy: TrophyData }>).detail?.trophy;
      if (!trophy) return;

      AudioEngine.getInstance().playSFX('trophy');
      setActiveTrophy({
        id: trophy.id,
        name: trophy.name || 'Succès débloqué',
        description: trophy.description || 'Félicitations pour cet exploit !',
        tier: trophy.tier || 'bronze',
      });
      setVisible(true);

      setTimeout(() => setVisible(false), 4500);
    };

    window.addEventListener('funny_station_trophy', handleTrophyUnlock);
    return () => {
      window.removeEventListener('funny_station_trophy', handleTrophyUnlock);
    };
  }, []);

  if (pathname && pathname.startsWith('/controller')) {
    return null;
  }

  if (!visible || !activeTrophy) return null;

  // Déterminer la couleur de la bordure et du badge
  let tierColor = 'text-amber-600 bg-amber-950/40 border-amber-800/50';
  let badgeLabel = 'Bronze';
  if (activeTrophy.tier === 'silver') {
    tierColor = 'text-zinc-400 bg-zinc-950/40 border-zinc-700/50';
    badgeLabel = 'Argent';
  } else if (activeTrophy.tier === 'gold') {
    tierColor = 'text-yellow-400 bg-yellow-950/40 border-yellow-700/50 text-glow-gold';
    badgeLabel = 'Or';
  } else if (activeTrophy.tier === 'platinum') {
    tierColor = 'text-cyan-300 bg-cyan-950/40 border-cyan-700/50 text-glow-neon';
    badgeLabel = 'Platine';
  }

  return (
    <div className="fixed top-8 right-8 z-50 flex items-center gap-4 p-4 rounded-xl glass-panel border border-zinc-800/80 w-80 animate-trophy-slide shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
      {/* Badge Trophée */}
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${tierColor} shadow-[0_0_10px_rgba(0,0,0,0.3)]`}>
        <Trophy size={24} />
      </div>

      {/* Contenu texte */}
      <div className="flex-1 flex flex-col gap-0.5">
        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 flex items-center gap-1">
          <Award size={10} />
          Trophée Débloqué - {badgeLabel}
        </span>
        <span className="text-xs font-bold text-zinc-100 tracking-wide">
          {activeTrophy.name}
        </span>
        <span className="text-[10px] text-zinc-400 leading-relaxed">
          {activeTrophy.description}
        </span>
      </div>
    </div>
  );
};
