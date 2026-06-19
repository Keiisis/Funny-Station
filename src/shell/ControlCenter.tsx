'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Smartphone, Gamepad2, Power, ShoppingBag, User, Settings, Clock, Trophy } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';

interface ControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPowerMenu: () => void;
  onChangeTab: (tab: 'games' | 'store' | 'profile') => void;
  activeGameTrophiesCount: number;
  activeGameUnlockedTrophiesCount: number;
  gamepadConnected: boolean;
  controllerType: 'pc' | 'mobile' | 'online' | null;
}

export const ControlCenter: React.FC<ControlCenterProps> = ({
  isOpen,
  onClose,
  onOpenPowerMenu,
  onChangeTab,
  activeGameTrophiesCount,
  activeGameUnlockedTrophiesCount,
  gamepadConnected,
  controllerType
}) => {
  const [volume, setVolume] = useState<number>(100);
  const [time, setTime] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync clock time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync volume with AudioEngine
  useEffect(() => {
    const engineVol = AudioEngine.getInstance().getVolume();
    setVolume(Math.round(engineVol * 100));
  }, [isOpen]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    AudioEngine.getInstance().setVolume(newVol / 100);
  };

  const adjustVolumeRelative = (amount: number) => {
    const nextVol = Math.max(0, Math.min(100, volume + amount));
    setVolume(nextVol);
    AudioEngine.getInstance().setVolume(nextVol / 100);
    AudioEngine.getInstance().playSFX('navigate');
  };

  // Keyboard navigation inside the Control Center
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        onClose();
        return;
      }

      // Control Center Quick Actions (6 items: Volume, Store, Profile, Power)
      // Index: 0 -> Volume, 1 -> Boutique, 2 -> Profil, 3 -> Éteindre
      const maxItems = 4;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', 0.1);
        setFocusedIndex((prev) => (prev + 1) % maxItems);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', -0.1);
        setFocusedIndex((prev) => (prev - 1 + maxItems) % maxItems);
      } else if (e.key === 'ArrowUp' && focusedIndex === 0) {
        e.preventDefault();
        adjustVolumeRelative(10); // Vol up
      } else if (e.key === 'ArrowDown' && focusedIndex === 0) {
        e.preventDefault();
        adjustVolumeRelative(-10); // Vol down
      } else if (e.key === 'Enter') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        triggerFocusedItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, volume]);

  // Handle Gamepad events mapped from custom event bus
  useEffect(() => {
    if (!isOpen) return;

    const handleGamepadAction = (e: CustomEvent<{ direction: string; action?: string }>) => {
      if (e.detail.action === 'up') return;
      const dir = e.detail.direction;

      const maxItems = 4;

      if (dir === 'RIGHT') {
        AudioEngine.getInstance().playSFX('navigate', 0.1);
        setFocusedIndex((prev) => (prev + 1) % maxItems);
      } else if (dir === 'LEFT') {
        AudioEngine.getInstance().playSFX('navigate', -0.1);
        setFocusedIndex((prev) => (prev - 1 + maxItems) % maxItems);
      } else if (dir === 'UP') {
        if (focusedIndex === 0) {
          adjustVolumeRelative(10);
        }
      } else if (dir === 'DOWN') {
        if (focusedIndex === 0) {
          adjustVolumeRelative(-10);
        }
      } else if (dir === 'CONFIRM') {
        AudioEngine.getInstance().playSFX('select');
        triggerFocusedItem();
      } else if (dir === 'BACK') {
        AudioEngine.getInstance().playSFX('select');
        onClose();
      }
    };

    window.addEventListener('funny_gamepad_action', handleGamepadAction as EventListener);
    return () => window.removeEventListener('funny_gamepad_action', handleGamepadAction as EventListener);
  }, [isOpen, focusedIndex, volume]);

  const triggerFocusedItem = () => {
    if (focusedIndex === 1) {
      onChangeTab('store');
      onClose();
    } else if (focusedIndex === 2) {
      onChangeTab('profile');
      onClose();
    } else if (focusedIndex === 3) {
      onOpenPowerMenu();
    }
  };

  const selectItemDirect = (index: number) => {
    AudioEngine.getInstance().playSFX('select');
    setFocusedIndex(index);
    if (index > 0) {
      // Small timeout to allow visual feedback
      setTimeout(() => {
        if (index === 1) {
          onChangeTab('store');
          onClose();
        } else if (index === 2) {
          onChangeTab('profile');
          onClose();
        } else if (index === 3) {
          onOpenPowerMenu();
        }
      }, 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-x-0 bottom-0 h-40 bg-zinc-950/70 border-t border-zinc-800/80 backdrop-blur-xl z-[45] flex items-center justify-between px-16 shadow-[0_-15px_40px_rgba(0,0,0,0.5)] animate-slide-up select-none"
      ref={containerRef}
    >
      {/* LEFT: Dynamic Stats & Trophies overview */}
      <div className="flex items-center gap-10">
        {/* Clock */}
        <div className="flex flex-col items-center justify-center gap-1 bg-[#101930]/40 border border-zinc-800/60 p-4 rounded-2xl w-24">
          <Clock size={16} className="text-blue-400" />
          <span className="text-xs font-black text-zinc-100 font-mono tracking-wide">{time}</span>
          <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-bold">Heure</span>
        </div>

        {/* Game Trophies */}
        {activeGameTrophiesCount > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1">
              <Trophy size={10} className="text-yellow-500" /> Progression Trophées
            </span>
            <div className="flex items-center gap-3">
              <div className="w-36 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-300"
                  style={{ width: `${(activeGameUnlockedTrophiesCount / activeGameTrophiesCount) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-zinc-300">
                {activeGameUnlockedTrophiesCount}/{activeGameTrophiesCount}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Main navigation shortcuts (Volume, Store, Profile, Shutdown) */}
      <div className="flex items-center gap-6">
        {/* Volume Node */}
        <div 
          onClick={() => selectItemDirect(0)}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer ${
            focusedIndex === 0 
              ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.25)]' 
              : 'border-zinc-850 bg-zinc-900/30'
          }`}
        >
          {volume === 0 ? <VolumeX size={16} className="text-zinc-500" /> : <Volume2 size={16} className="text-blue-400" />}
          <div className="flex flex-col gap-1">
            <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-black">Volume</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={volume} 
              onChange={handleVolumeChange}
              className="w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Boutique Store Shortcut */}
        <button 
          onClick={() => selectItemDirect(1)}
          className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            focusedIndex === 1 
              ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)] scale-105' 
              : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:text-white'
          }`}
          title="Boutique"
        >
          <ShoppingBag size={18} />
          <span className="text-[6px] uppercase tracking-widest font-black">Store</span>
        </button>

        {/* Profil Shortcut */}
        <button 
          onClick={() => selectItemDirect(2)}
          className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            focusedIndex === 2 
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-105' 
              : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:text-white'
          }`}
          title="Profil"
        >
          <User size={18} />
          <span className="text-[6px] uppercase tracking-widest font-black">Profil</span>
        </button>

        {/* Power Menu Shortcut */}
        <button 
          onClick={() => selectItemDirect(3)}
          className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
            focusedIndex === 3 
              ? 'border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)] scale-105' 
              : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:text-red-500/80'
          }`}
          title="Alimentation"
        >
          <Power size={18} />
          <span className="text-[6px] uppercase tracking-widest font-black">Alim.</span>
        </button>
      </div>

      {/* RIGHT: Controller type & connection status */}
      <div className="flex items-center gap-4 bg-[#101930]/30 border border-zinc-800/40 p-4 rounded-2xl min-w-[140px] justify-center">
        {controllerType === 'mobile' ? (
          <Smartphone size={16} className="text-emerald-400" />
        ) : (
          <Gamepad2 
            size={16} 
            className={gamepadConnected || controllerType === 'pc' ? 'text-blue-400' : 'text-zinc-650'} 
          />
        )}
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-black">Périphérique</span>
          <span className="text-[10px] font-black text-zinc-200">
            {controllerType === 'mobile' 
              ? 'Manette Mobile' 
              : gamepadConnected 
              ? 'Gamepad Bluetooth' 
              : 'Clavier PC'}
          </span>
        </div>
      </div>
    </div>
  );
};
