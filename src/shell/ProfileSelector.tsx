'use client';

import React, { useState } from 'react';
import { useGamepadNavigation } from '@/hooks/useGamepadNavigation';
import { AudioEngine } from '@/drivers/AudioEngine';
import { GamepadController } from '@/drivers/GamepadController';
import { User, Plus, ShieldAlert, Cpu } from 'lucide-react';

interface ProfileData {
  id: string;
  username: string;
  avatar: string;
  funnyCoins: number;
}

interface ProfileSelectorProps {
  onSelectProfile: (profile: ProfileData) => void;
}

const DEFAULT_PROFILES: ProfileData[] = [
  { id: '1', username: 'Aloy', avatar: '🏹', funnyCoins: 1250 },
  { id: '2', username: 'Kratos', avatar: '🪓', funnyCoins: 5000 },
  { id: '3', username: 'Spider-Man', avatar: '🕸️', funnyCoins: 850 },
  { id: '4', username: 'Nathan Drake', avatar: '🗺️', funnyCoins: 2100 }
];

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onSelectProfile }) => {
  const [profiles, setProfiles] = useState<ProfileData[]>(DEFAULT_PROFILES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hidStatus, setHidStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  const handleConfirm = () => {
    AudioEngine.getInstance().playSFX('select');
    if (activeIndex < profiles.length) {
      onSelectProfile(profiles[activeIndex]);
    } else {
      // Action "+ Ajouter un profil" (simulation)
      const newName = prompt("Entrez le nom du nouveau profil :");
      if (newName) {
        const avatars = ['🎮', '👑', '🧙', '👽', '🦖', '🐼'];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        const newProfile: ProfileData = {
          id: String(profiles.length + 1),
          username: newName,
          avatar: randomAvatar,
          funnyCoins: 500
        };
        setProfiles([...profiles, newProfile]);
      }
    }
  };

  useGamepadNavigation(
    profiles.length + 1, // +1 pour le bouton "+"
    activeIndex,
    setActiveIndex,
    handleConfirm,
    undefined,
    5 // 5 colonnes
  );

  const handleConnectDualSense = async () => {
    const success = await GamepadController.getInstance().requestDualSenseAccess();
    if (success) {
      setHidStatus('connected');
      AudioEngine.getInstance().playSFX('select');
    } else {
      setHidStatus('error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white px-4 select-none relative z-10">
      {/* Titre central */}
      <h1 className="text-4xl font-extralight tracking-widest mb-12 text-zinc-100 text-center animate-fade-in">
        Qui utilise cette <span className="font-bold text-glow-neon text-blue-500">FUNNY STATION</span> ?
      </h1>

      {/* Profils Grid */}
      <div className="flex flex-wrap items-center justify-center gap-8 mb-16 max-w-4xl">
        {profiles.map((profile, idx) => {
          const isFocused = idx === activeIndex;
          return (
            <div
              key={profile.id}
              onClick={() => {
                setActiveIndex(idx);
                onSelectProfile(profile);
                AudioEngine.getInstance().playSFX('select');
              }}
              className={`flex flex-col items-center cursor-pointer transition-all duration-300 transform ${
                isFocused ? 'scale-110' : 'scale-100 opacity-60 hover:opacity-95'
              }`}
            >
              {/* Avatar circle */}
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-4 transition-all duration-300 ${
                  isFocused
                    ? 'bg-gradient-to-tr from-blue-600 to-violet-600 shadow-[0_0_25px_rgba(0,114,206,0.8)] border-2 border-white'
                    : 'bg-zinc-800/80 border border-zinc-700'
                }`}
              >
                {profile.avatar}
              </div>
              <span className={`text-sm tracking-wide font-medium ${isFocused ? 'text-white font-bold' : 'text-zinc-400'}`}>
                {profile.username}
              </span>
              <span className="text-[10px] text-zinc-500 mt-1">🪙 {profile.funnyCoins} FC</span>
            </div>
          );
        })}

        {/* Bouton Ajouter Profil */}
        <div
          onClick={() => {
            setActiveIndex(profiles.length);
            handleConfirm();
          }}
          className={`flex flex-col items-center cursor-pointer transition-all duration-300 transform ${
            activeIndex === profiles.length ? 'scale-110' : 'scale-100 opacity-60 hover:opacity-95'
          }`}
        >
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
              activeIndex === profiles.length
                ? 'bg-zinc-100 text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.7)] border-2 border-white'
                : 'bg-zinc-800/40 border border-zinc-700 border-dashed text-zinc-500'
            }`}
          >
            <Plus size={32} />
          </div>
          <span className={`text-sm tracking-wide ${activeIndex === profiles.length ? 'text-white font-bold' : 'text-zinc-400'}`}>
            Nouveau
          </span>
          <span className="text-[10px] text-zinc-500 mt-1">&nbsp;</span>
        </div>
      </div>

      {/* Raccordement WebHID DualSense */}
      <button
        onClick={handleConnectDualSense}
        className={`glass-panel px-6 py-3 rounded-full flex items-center gap-3 text-xs tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 ${
          hidStatus === 'connected'
            ? 'border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
            : hidStatus === 'error'
            ? 'border-red-500/50 text-red-400'
            : 'border-zinc-800 text-zinc-300 hover:border-blue-500/50'
        }`}
      >
        <Cpu size={14} className={hidStatus === 'connected' ? 'animate-pulse' : ''} />
        {hidStatus === 'connected' ? (
          <span>DualSense connectée (Haptique active)</span>
        ) : hidStatus === 'error' ? (
          <span>Erreur ou Appareil non trouvé</span>
        ) : (
          <span>Activer Retour Haptique DualSense (WebHID)</span>
        )}
      </button>

      {/* Guide Clavier/Manette */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
        <div className="flex items-center gap-1.5">
          <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-sans">← →</span>
          <span>Naviguer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-sans">Entrée</span>
          <span>Sélectionner</span>
        </div>
      </div>
    </div>
  );
};
