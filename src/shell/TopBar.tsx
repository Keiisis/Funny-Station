'use client';

import React, { useState, useEffect } from 'react';
import { Gamepad, Settings, User } from 'lucide-react';

interface TopBarProps {
  username: string;
  avatar: string;
  funnyCoins: number;
  onOpenSettings?: () => void;
  onOpenControllerMenu?: () => void;
  activeControllerType?: 'pc' | 'mobile' | 'online' | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  username,
  avatar,
  funnyCoins,
  onOpenSettings,
  onOpenControllerMenu,
  activeControllerType
}) => {
  const [time, setTime] = useState<string>('');
  const [gamepadConnected, setGamepadConnected] = useState(false);

  useEffect(() => {
    // Mettre à jour l'horloge système toutes les secondes
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Détecter l'état des manettes
    const checkGamepads = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gps = navigator.getGamepads();
        const anyConnected = Array.from(gps).some(gp => gp !== null);
        setGamepadConnected(anyConnected);
      }
    };

    checkGamepads();
    window.addEventListener('gamepadconnected', checkGamepads);
    window.addEventListener('gamepaddisconnected', checkGamepads);

    return () => {
      clearInterval(timer);
      window.removeEventListener('gamepadconnected', checkGamepads);
      window.removeEventListener('gamepaddisconnected', checkGamepads);
    };
  }, []);

  return (
    <div className="w-full flex items-center justify-between px-8 py-4 select-none relative z-20">
      {/* Profil à gauche */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(0,0,0,0.5)]">
          {avatar}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-wider text-zinc-100">{username}</span>
          <span className="text-[10px] text-amber-400 font-bold tracking-wide flex items-center gap-1">
            🪙 {funnyCoins} FC
          </span>
        </div>
      </div>

      {/* Info système & Statut à droite */}
      <div className="flex items-center gap-6 text-zinc-300 font-medium text-xs tracking-wider">
        {/* Statut Manette */}
        <button
          onClick={onOpenControllerMenu}
          className="flex items-center gap-1.5 hover:text-zinc-100 transition-all duration-200 cursor-pointer focus:outline-none"
          title="Sélectionner le mode de manette"
        >
          <Gamepad
            size={16}
            className={`transition-colors duration-300 ${
              activeControllerType === 'pc'
                ? 'text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.8)] animate-pulse' 
                : activeControllerType === 'mobile'
                ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]'
                : activeControllerType === 'online'
                ? 'text-purple-400 drop-shadow-[0_0_4px_rgba(168,85,247,0.8)] animate-pulse'
                : gamepadConnected
                ? 'text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.8)]'
                : 'text-zinc-600'
            }`}
          />
          <span className={
            activeControllerType === 'pc' || gamepadConnected 
              ? 'text-blue-400 font-semibold' 
              : activeControllerType === 'mobile'
              ? 'text-emerald-400 font-semibold'
              : activeControllerType === 'online'
              ? 'text-purple-400 font-semibold'
              : 'text-zinc-500'
          }>
            {activeControllerType === 'pc'
              ? 'Manette PC' 
              : activeControllerType === 'mobile'
              ? 'Portable'
              : activeControllerType === 'online'
              ? 'En Ligne'
              : gamepadConnected
              ? 'Manette'
              : 'Clavier'}
          </span>
        </button>

        {/* Paramètres */}
        <button
          onClick={onOpenSettings}
          className="hover:text-white transition-colors duration-200 outline-none flex items-center"
          title="Paramètres"
        >
          <Settings size={16} className="text-zinc-400 hover:text-white hover:rotate-45 transition-transform duration-300" />
        </button>

        {/* Heure */}
        <span className="font-mono text-zinc-100">{time}</span>
      </div>
    </div>
  );
};
