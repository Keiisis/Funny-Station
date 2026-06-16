'use client';

import React, { useState, useEffect } from 'react';
import { useGamepadNavigation } from '@/hooks/useGamepadNavigation';
import { AudioEngine } from '@/drivers/AudioEngine';
import { GamepadController } from '@/drivers/GamepadController';
import { ProfileData } from '@/types';
import { User, Plus, Lock, Cpu, Eye, EyeOff, ShieldCheck, ChevronRight, Coins } from 'lucide-react';
import { PRESET_AVATARS } from './ProfileSpace';

interface ProfileSelectorProps {
  onSelectProfile: (profile: ProfileData) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onSelectProfile }) => {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hidStatus, setHidStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  // Login Modal State
  const [selectedProfileForLogin, setSelectedProfileForLogin] = useState<ProfileData | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Create Profile Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAccountType, setNewAccountType] = useState<'gamer' | 'creator'>('gamer');
  const [newAvatar, setNewAvatar] = useState(PRESET_AVATARS[0]);

  // Load profiles from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('funny_station_profiles');
    if (stored) {
      setProfiles(JSON.parse(stored));
    } else {
      const initialProfiles: ProfileData[] = [
        { 
          id: '1', 
          username: 'Aloy', 
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 
          funnyCoins: 1250, 
          accountType: 'gamer',
          ownedGames: ['g1', 'g2']
        },
        { 
          id: '2', 
          username: 'Kratos', 
          avatar: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80', 
          funnyCoins: 5000, 
          accountType: 'gamer',
          ownedGames: ['g1', 'g2', 'g3', 'g4', 'g5'],
          password: '123'
        },
        { 
          id: '3', 
          username: 'Spider-Man', 
          avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80', 
          funnyCoins: 850, 
          accountType: 'gamer',
          ownedGames: ['g1', 'g3']
        },
        { 
          id: '4', 
          username: 'Nathan Drake', 
          avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80', 
          funnyCoins: 2100, 
          accountType: 'creator',
          ownedGames: ['g1', 'g2', 'g4']
        }
      ];
      setProfiles(initialProfiles);
      localStorage.setItem('funny_station_profiles', JSON.stringify(initialProfiles));
    }
  }, []);

  const handleConfirm = () => {
    AudioEngine.getInstance().playSFX('select');
    if (activeIndex < profiles.length) {
      handleProfileSelectClick(profiles[activeIndex]);
    } else {
      setShowCreateModal(true);
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

  const handleProfileSelectClick = (profile: ProfileData) => {
    AudioEngine.getInstance().playSFX('select');
    if (profile.password) {
      setSelectedProfileForLogin(profile);
      setPasswordInput('');
      setPasswordError('');
    } else {
      onSelectProfile(profile);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileForLogin) return;

    if (passwordInput === selectedProfileForLogin.password) {
      AudioEngine.getInstance().playSFX('select');
      onSelectProfile(selectedProfileForLogin);
    } else {
      AudioEngine.getInstance().playSFX('navigate');
      setPasswordError('Mot de passe incorrect. Réessayez.');
    }
  };

  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const newProfile: ProfileData = {
      id: String(Date.now()),
      username: newUsername.trim(),
      avatar: newAvatar,
      funnyCoins: 500,
      accountType: newAccountType,
      ownedGames: ['g1'], // Default initial game owned
      password: newPassword.trim() || undefined
    };

    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('funny_station_profiles', JSON.stringify(updated));

    AudioEngine.getInstance().playSFX('select');
    setShowCreateModal(false);
    
    // Auto login to the newly created profile
    onSelectProfile(newProfile);

    // Reset Form
    setNewUsername('');
    setNewPassword('');
    setNewAccountType('gamer');
    setNewAvatar(PRESET_AVATARS[0]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white px-4 select-none relative z-10">
      {/* Background radial gradient decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,24,48,0.4)_0%,rgba(2,6,23,0.98)_80%)] -z-10 pointer-events-none" />

      {/* Titre central */}
      <h1 className="text-4xl font-extralight tracking-widest mb-16 text-zinc-100 text-center animate-fade-in uppercase">
        Qui utilise cette <span className="font-bold text-glow-neon text-blue-500">FUNNY STATION</span> ?
      </h1>

      {/* Profils Grid */}
      <div className="flex flex-wrap items-center justify-center gap-8 mb-16 max-w-5xl">
        {profiles.map((profile, idx) => {
          const isFocused = idx === activeIndex;
          const hasPwd = !!profile.password;
          
          return (
            <div
              key={profile.id}
              onClick={() => {
                setActiveIndex(idx);
                handleProfileSelectClick(profile);
              }}
              className={`flex flex-col items-center cursor-pointer transition-all duration-300 transform ${
                isFocused ? 'scale-105' : 'scale-100 opacity-60 hover:opacity-95'
              }`}
            >
              {/* Profile Card Tile (PS5 Style Card instead of simple Circle) */}
              <div
                className={`w-36 h-48 rounded-2xl flex flex-col justify-between p-4 relative overflow-hidden transition-all duration-300 ${
                  isFocused
                    ? 'bg-gradient-to-b from-[#1a2745]/90 to-[#0e172e]/95 border-2 border-white shadow-[0_0_25px_rgba(0,114,206,0.6)]'
                    : 'bg-zinc-900/80 border border-zinc-800'
                }`}
              >
                {/* Visual Glow Layer */}
                {isFocused && (
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
                )}

                {/* Top: Avatar & Lock Indicator */}
                <div className="flex justify-between items-start">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-zinc-700/60 shadow-md">
                    <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                  </div>
                  {hasPwd && (
                    <div className="p-1 rounded bg-zinc-950/80 border border-zinc-850 text-zinc-400">
                      <Lock size={12} />
                    </div>
                  )}
                </div>

                {/* Bottom: Pseudo, Type, and Balance */}
                <div className="flex flex-col gap-1 mt-auto">
                  <span className={`text-xs tracking-wide font-black truncate ${isFocused ? 'text-white' : 'text-zinc-300'}`}>
                    {profile.username}
                  </span>
                  
                  <span className="text-[7px] uppercase tracking-widest font-bold text-zinc-500">
                    {profile.accountType === 'creator' ? 'Créateur' : 'Gamer'}
                  </span>

                  <div className="flex items-center gap-1 text-[9px] text-amber-400 font-bold mt-1">
                    <Coins size={10} />
                    <span>{profile.funnyCoins} FC</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Bouton Ajouter Profil (Tile) */}
        <div
          onClick={() => {
            setActiveIndex(profiles.length);
            setShowCreateModal(true);
          }}
          className={`flex flex-col items-center cursor-pointer transition-all duration-300 transform ${
            activeIndex === profiles.length ? 'scale-105' : 'scale-100 opacity-60 hover:opacity-95'
          }`}
        >
          <div
            className={`w-36 h-48 rounded-2xl flex flex-col items-center justify-center p-4 transition-all duration-300 border border-dashed ${
              activeIndex === profiles.length
                ? 'bg-zinc-100 text-zinc-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.7)]'
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
            }`}
          >
            <Plus size={36} className={activeIndex === profiles.length ? 'text-zinc-950' : 'text-zinc-600'} />
            <span className={`text-xs tracking-wider uppercase font-bold mt-3 ${activeIndex === profiles.length ? 'text-zinc-950' : 'text-zinc-500'}`}>
              Nouveau
            </span>
          </div>
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

      {/* Login Password Modal (PIN entry) */}
      {selectedProfileForLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-8 rounded-3xl border border-zinc-800/80 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-6">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg mx-auto">
              <img src={selectedProfileForLogin.avatar} alt={selectedProfileForLogin.username} className="w-full h-full object-cover" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-base font-black tracking-wider text-zinc-100 uppercase">Protection du Profil</h3>
              <p className="text-xs text-zinc-400">Entrez le mot de passe pour accéder à <strong>{selectedProfileForLogin.username}</strong>.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Code de sécurité"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-850 text-white text-center text-sm font-bold focus:border-blue-500/50 focus:outline-none transition-colors"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordError && (
                <span className="text-[10px] text-red-400 font-bold bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg">
                  {passwordError}
                </span>
              )}

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    AudioEngine.getInstance().playSFX('select');
                    setSelectedProfileForLogin(null);
                  }}
                  className="py-2.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider bg-zinc-950/40"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md"
                >
                  Déverrouiller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-6">
            
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-black tracking-wider text-zinc-100 uppercase flex items-center justify-center gap-2">
                <ShieldCheck size={20} className="text-blue-500" />
                <span>Nouveau Profil</span>
              </h3>
              <p className="text-[11px] text-zinc-400 text-center">Créez votre carte de profil et configurez vos paramètres de base</p>
            </div>

            <form onSubmit={handleCreateProfileSubmit} className="flex flex-col gap-4">
              {/* Pseudo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Pseudo</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Pseudo de joueur"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-white text-xs focus:border-blue-500/50 focus:outline-none transition-colors"
                  maxLength={15}
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Mot de passe (Optionnel)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Saisir pour protéger le compte"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-white text-xs focus:border-blue-500/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Account type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Type de Profil</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      AudioEngine.getInstance().playSFX('select');
                      setNewAccountType('gamer');
                    }}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      newAccountType === 'gamer'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-zinc-850 bg-zinc-950/40 text-zinc-400'
                    }`}
                  >
                    Gamer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      AudioEngine.getInstance().playSFX('select');
                      setNewAccountType('creator');
                    }}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      newAccountType === 'creator'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-zinc-850 bg-zinc-950/40 text-zinc-400'
                    }`}
                  >
                    Game Creator
                  </button>
                </div>
              </div>

              {/* Avatar presets selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        AudioEngine.getInstance().playSFX('select');
                        setNewAvatar(url);
                      }}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                        newAvatar === url
                          ? 'border-blue-500 scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Avatar Preset ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    AudioEngine.getInstance().playSFX('select');
                    setShowCreateModal(false);
                  }}
                  className="py-2.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider bg-zinc-950/40"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-wider shadow-md"
                >
                  Créer & Connecter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
