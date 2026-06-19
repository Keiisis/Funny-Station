'use client';

import React, { useState, useEffect } from 'react';
import { Gamepad, Settings, User, Coins, Search, Power } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';

interface TopBarProps {
  username: string;
  avatar: string;
  funnyCoins: number;
  activeTab: 'games' | 'store' | 'profile';
  onChangeTab: (tab: 'games' | 'store' | 'profile') => void;
  onOpenSettings?: () => void;
  onOpenControllerMenu?: () => void;
  onOpenPowerMenu?: () => void;
  activeControllerType?: 'pc' | 'mobile' | 'online' | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  username,
  avatar,
  funnyCoins,
  activeTab,
  onChangeTab,
  onOpenSettings,
  onOpenControllerMenu,
  onOpenPowerMenu,
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
          minute: '2-digit',
          hour12: true
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

  const handleTabClick = (tab: 'games' | 'store' | 'profile') => {
    AudioEngine.getInstance().playSFX('select');
    onChangeTab(tab);
  };

  return (
    <div className="w-full flex items-center justify-between px-12 py-5 select-none relative z-20 bg-gradient-to-b from-black/40 to-transparent">
      {/* Onglets à gauche (Style PS5) */}
      <div className="flex items-center gap-8">
        <button
          onClick={() => handleTabClick('games')}
          className={`text-sm font-bold tracking-widest uppercase transition-all focus:outline-none cursor-pointer ${
            activeTab === 'games' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Jeux
        </button>
        <button
          onClick={() => handleTabClick('store')}
          className={`text-sm font-bold tracking-widest uppercase transition-all focus:outline-none cursor-pointer ${
            activeTab === 'store' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Boutique
        </button>
      </div>

      {/* Info système & Statut à droite (Style PS5) */}
      <div className="flex items-center gap-6 text-zinc-300 font-medium text-xs tracking-wider">
        {/* Rechercher */}
        <button
          onClick={() => handleTabClick('store')}
          className="hover:text-white transition-colors duration-200 focus:outline-none cursor-pointer flex items-center"
          title="Rechercher des jeux"
        >
          <Search size={16} className="text-zinc-400 hover:text-white" />
        </button>

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
              ? 'PC' 
              : activeControllerType === 'mobile'
              ? 'Portable'
              : activeControllerType === 'online'
              ? 'En Ligne'
              : gamepadConnected
              ? 'Manette'
              : 'Clavier'}
          </span>
        </button>

        {/* FunnyCoins summary in topbar */}
        <div className="flex items-center gap-1 text-amber-400 font-bold tracking-wide">
          <Coins size={12} className="text-amber-400" />
          <span>{funnyCoins} FC</span>
        </div>

        {/* Paramètres */}
        <button
          onClick={onOpenSettings}
          className="hover:text-white transition-colors duration-200 outline-none flex items-center cursor-pointer"
          title="Paramètres / Se déconnecter"
        >
          <Settings size={16} className="text-zinc-400 hover:text-white hover:rotate-45 transition-transform duration-300" />
        </button>

        {/* Alimentation */}
        <button
          onClick={() => {
            AudioEngine.getInstance().playSFX('select');
            onOpenPowerMenu?.();
          }}
          className="hover:text-red-400 transition-colors duration-200 outline-none flex items-center cursor-pointer"
          title="Alimentation"
        >
          <Power size={16} className="text-zinc-400 hover:text-red-500 transition-transform duration-300" />
        </button>

        {/* Avatar Profil clickable */}
        <button
          onClick={() => handleTabClick('profile')}
          className={`w-7 h-7 rounded-lg bg-zinc-800 border overflow-hidden flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer ${
            activeTab === 'profile' ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'border-zinc-700'
          }`}
          title={`Profil : ${username}`}
        >
          {avatar.startsWith('http') ? (
            <img src={avatar} alt={username} className="w-full h-full object-cover" />
          ) : (
            <User size={12} className="text-zinc-400" />
          )}
        </button>

        {/* Heure */}
        <span className="font-mono text-zinc-100 min-w-[50px] text-right">{time}</span>
      </div>
    </div>
  );
};
