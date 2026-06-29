'use client';

import React, { useState, useEffect } from 'react';
import { Gamepad, Settings, User, Coins, Search, Power, Users, Trophy, Music, Eye, Calendar, Flame, Crown, AreaChart } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { NotificationBadge } from './NotificationCenter';
import { fetchDailyStatus } from '@/lib/progression';
import { fetchOnlineFriends } from '@/lib/social';

export type TopBarTabType = 'games' | 'store' | 'profile' | 'friends' | 'leaderboard' | 'season' | 'playlist' | 'spectate' | 'creator_dashboard';

interface TopBarProps {
  userId: string;
  username: string;
  avatar: string;
  funnyCoins: number;
  activeTab: TopBarTabType;
  onChangeTab: (tab: TopBarTabType) => void;
  onOpenSettings?: () => void;
  onOpenControllerMenu?: () => void;
  onOpenPowerMenu?: () => void;
  activeControllerType?: 'pc' | 'mobile' | 'online' | null;
  accountType?: 'gamer' | 'creator';
  notificationCount: number;
  onOpenNotifications: () => void;
  /** Onglet ciblé par la navigation manette/clavier (surbrillance), sans clic. */
  navFocusedTab?: TopBarTabType | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  userId,
  username,
  avatar,
  funnyCoins,
  activeTab,
  onChangeTab,
  onOpenSettings,
  onOpenControllerMenu,
  onOpenPowerMenu,
  activeControllerType,
  accountType = 'gamer',
  notificationCount,
  onOpenNotifications,
  navFocusedTab = null
}) => {
  // Surbrillance d'un onglet ciblé par la manette/clavier (navigation sans souris).
  const nf = (tab: TopBarTabType) =>
    navFocusedTab === tab ? ' ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent rounded-md scale-110' : '';
  const [time, setTime] = useState<string>('');
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [streak, setStreak] = useState(0);
  const [onlineFriendsCount, setOnlineFriendsCount] = useState(0);

  useEffect(() => {
    // Clock
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

    // Gamepads
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

    // Fetch streak and online friends
    if (userId) {
      fetchDailyStatus(userId).then(status => setStreak(status.streak)).catch(console.error);
      fetchOnlineFriends(userId).then(friends => setOnlineFriendsCount(friends.length)).catch(console.error);
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('gamepadconnected', checkGamepads);
      window.removeEventListener('gamepaddisconnected', checkGamepads);
    };
  }, [userId]);

  const handleTabClick = (tab: TopBarTabType) => {
    AudioEngine.getInstance().playSFX('select');
    onChangeTab(tab);
  };

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between px-12 py-5 select-none relative z-20 bg-gradient-to-b from-black/60 to-transparent gap-4">
      {/* Onglets à gauche (Style PS5) */}
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <button
          onClick={() => handleTabClick('games')}
          className={`${nf('games')} text-xs md:text-sm font-black tracking-widest uppercase transition-all focus:outline-none cursor-pointer ${
            activeTab === 'games' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Jeux
        </button>
        <button
          onClick={() => handleTabClick('store')}
          className={`${nf('store')} text-xs md:text-sm font-black tracking-widest uppercase transition-all focus:outline-none cursor-pointer ${
            activeTab === 'store' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Boutique
        </button>
        <button
          onClick={() => handleTabClick('friends')}
          className={`${nf('friends')} text-xs md:text-sm font-black tracking-widest uppercase transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'friends' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users size={14} /> Amis
          {onlineFriendsCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          )}
        </button>
        <button
          onClick={() => handleTabClick('leaderboard')}
          className={`${nf('leaderboard')} text-xs md:text-sm font-black tracking-widest uppercase transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leaderboard' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Trophy size={14} /> Classements
        </button>
        <button
          onClick={() => handleTabClick('season')}
          className={`${nf('season')} text-xs md:text-sm font-black tracking-widest uppercase transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'season' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Crown size={14} /> Saison Pass
        </button>
        <button
          onClick={() => handleTabClick('playlist')}
          className={`${nf('playlist')} text-xs md:text-sm font-black tracking-widest uppercase transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'playlist' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Music size={14} /> Musique
        </button>
        <button
          onClick={() => handleTabClick('spectate')}
          className={`${nf('spectate')} text-xs md:text-sm font-black tracking-widest uppercase transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'spectate' 
              ? 'text-white border-b-2 border-white pb-0.5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Eye size={14} /> Spectateur
        </button>
        {accountType === 'creator' && (
          <button
            onClick={() => handleTabClick('creator_dashboard')}
            className={`${nf('creator_dashboard')} text-xs md:text-sm font-black tracking-widest uppercase transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'creator_dashboard' 
                ? 'text-white border-b-2 border-white pb-0.5' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AreaChart size={14} /> Dashboard Créateur
          </button>
        )}
      </div>

      {/* Info système & Statut à droite (Style PS5) */}
      <div className="flex flex-wrap items-center gap-4 md:gap-5 text-zinc-300 font-medium text-xs tracking-wider justify-end w-full md:w-auto">
        {/* Daily Streak */}
        {streak > 0 && (
          <div className="flex items-center gap-1 text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider" title={`${streak} jours consécutifs !`}>
            <Flame size={12} className="fill-orange-400 animate-pulse" />
            <span>{streak} Jours</span>
          </div>
        )}

        {/* Player Level & XP Badge */}
        {userId && (
          <PlayerLevelBadge userId={userId} variant="topbar" />
        )}

        {/* Notifications */}
        <NotificationBadge count={notificationCount} onClick={onOpenNotifications} />

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
