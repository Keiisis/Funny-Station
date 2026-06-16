'use client';

import React, { useState, useEffect } from 'react';
import { useGamepadNavigation } from '@/hooks/useGamepadNavigation';
import { AudioEngine } from '@/drivers/AudioEngine';
import { GamepadController } from '@/drivers/GamepadController';
import { ProfileData } from '@/types';
import { Plus, Lock, Cpu, Eye, EyeOff, ShieldCheck, Coins, ArrowLeft, Delete, Check } from 'lucide-react';
import { PRESET_AVATARS } from './ProfileSpace';

interface ProfileSelectorProps {
  onSelectProfile: (profile: ProfileData) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onSelectProfile }) => {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hidStatus, setHidStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  // Login Modal State (Console PIN Pad)
  const [selectedProfileForLogin, setSelectedProfileForLogin] = useState<ProfileData | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState('');

  // Create Profile Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newAccountType, setNewAccountType] = useState<'gamer' | 'creator'>('gamer');
  const [newAvatar, setNewAvatar] = useState(PRESET_AVATARS[0]);

  // Load profiles from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('funny_station_profiles');
    let needsUpdate = false;
    let profilesList: ProfileData[] = [];
    
    if (stored) {
      try {
        profilesList = JSON.parse(stored);
        // Ensure all profiles have passwords to comply with security requirements
        profilesList = profilesList.map(p => {
          if (!p.password) {
            needsUpdate = true;
            if (p.username === 'Aloy') return { ...p, password: '1111' };
            if (p.username === 'Spider-Man') return { ...p, password: '2002' };
            if (p.username === 'Nathan Drake') return { ...p, password: '5678' };
            return { ...p, password: '0000' };
          }
          return p;
        });
      } catch (e) {
        needsUpdate = true;
      }
    }

    if (stored && !needsUpdate) {
      setProfiles(profilesList);
    } else {
      const initialProfiles: ProfileData[] = [
        { 
          id: '1', 
          username: 'Aloy', 
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 
          funnyCoins: 1250, 
          accountType: 'gamer',
          ownedGames: ['g1', 'g2'],
          password: '1111'
        },
        { 
          id: '2', 
          username: 'Kratos', 
          avatar: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80', 
          funnyCoins: 5000, 
          accountType: 'gamer',
          ownedGames: ['g1', 'g2', 'g3', 'g4', 'g5'],
          password: '1234'
        },
        { 
          id: '3', 
          username: 'Spider-Man', 
          avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80', 
          funnyCoins: 850, 
          accountType: 'gamer',
          ownedGames: ['g1', 'g3'],
          password: '2002'
        },
        { 
          id: '4', 
          username: 'Nathan Drake', 
          avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80', 
          funnyCoins: 2100, 
          accountType: 'creator',
          ownedGames: ['g1', 'g2', 'g4'],
          password: '5678'
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
    profiles.length + 1,
    activeIndex,
    setActiveIndex,
    handleConfirm,
    undefined,
    5,
    selectedProfileForLogin !== null || showCreateModal
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
      setPinInput('');
      setPasswordError('');
    } else {
      onSelectProfile(profile);
    }
  };

  // PIN pad actions
  const handlePinKeyPress = (num: string) => {
    AudioEngine.getInstance().playSFX('navigate');
    if (pinInput.length < 8) {
      const newVal = pinInput + num;
      setPinInput(newVal);
      setPasswordError('');
      
      // Auto-validate if length matches profile PIN
      if (selectedProfileForLogin && newVal === selectedProfileForLogin.password) {
        setTimeout(() => {
          AudioEngine.getInstance().playSFX('select');
          onSelectProfile(selectedProfileForLogin);
        }, 150);
      }
    }
  };

  const handlePinBackspace = () => {
    AudioEngine.getInstance().playSFX('navigate');
    setPinInput(prev => prev.slice(0, -1));
    setPasswordError('');
  };

  const handlePinSubmit = () => {
    if (!selectedProfileForLogin) return;
    if (pinInput === selectedProfileForLogin.password) {
      AudioEngine.getInstance().playSFX('select');
      onSelectProfile(selectedProfileForLogin);
    } else {
      AudioEngine.getInstance().playSFX('navigate');
      setPasswordError('PIN incorrect. Réessayez.');
      setPinInput('');
    }
  };

  // Keyboard support for PIN Pad entry
  useEffect(() => {
    if (!selectedProfileForLogin) return;

    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Enter') {
        handlePinSubmit();
      } else if (e.key === 'Escape') {
        setSelectedProfileForLogin(null);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, [selectedProfileForLogin, pinInput]);

  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const newProfile: ProfileData = {
      id: String(Date.now()),
      username: newUsername.trim(),
      avatar: newAvatar,
      funnyCoins: 500,
      accountType: newAccountType,
      ownedGames: ['g1'],
      password: newPin.trim() || undefined
    };

    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('funny_station_profiles', JSON.stringify(updated));

    AudioEngine.getInstance().playSFX('select');
    setShowCreateModal(false);
    
    // Auto login
    onSelectProfile(newProfile);

    // Reset Form
    setNewUsername('');
    setNewPin('');
    setNewAccountType('gamer');
    setNewAvatar(PRESET_AVATARS[0]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white px-4 select-none relative z-10">
      {/* Background radial gradient decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,24,48,0.45)_0%,rgba(2,6,23,0.99)_80%)] -z-10 pointer-events-none" />

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
              {/* Profile Card Tile (PS5 Style Card) */}
              <div
                className={`w-36 h-48 rounded-2xl flex flex-col justify-between p-3 relative overflow-hidden transition-all duration-300 ${
                  isFocused
                    ? 'bg-gradient-to-b from-[#1c2a4f]/95 to-[#0b1227]/98 border-2 border-white shadow-[0_0_25px_rgba(59,130,246,0.65)]'
                    : 'bg-zinc-900/80 border border-zinc-800'
                }`}
              >
                {/* Visual Glow Layer */}
                {isFocused && (
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
                )}

                {/* Top: Portrait Avatar & Lock Indicator */}
                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-zinc-800/80 shadow-md bg-zinc-950">
                  <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                  {hasPwd && (
                    <div className="absolute top-1.5 right-1.5 p-1 rounded bg-zinc-950/80 border border-zinc-800/60 text-zinc-400">
                      <Lock size={10} />
                    </div>
                  )}
                </div>

                {/* Bottom: Pseudo, Type, and Balance */}
                <div className="flex flex-col gap-0.5 mt-2">
                  <span className={`text-xs tracking-wide font-black truncate ${isFocused ? 'text-white' : 'text-zinc-300'}`}>
                    {profile.username}
                  </span>
                  
                  <span className="text-[7px] uppercase tracking-widest font-black text-zinc-500">
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

      {/* Console-style PIN Pad Entry Dialog */}
      {selectedProfileForLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-8 rounded-3xl border border-zinc-800/80 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-5">
            
            {/* User Profile Info */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md">
                <img src={selectedProfileForLogin.avatar} alt={selectedProfileForLogin.username} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-sm font-black tracking-wider text-zinc-100 uppercase">{selectedProfileForLogin.username}</h3>
              <p className="text-[10px] text-zinc-500">Saisir le code PIN de sécurité</p>
            </div>

            {/* Display code entered */}
            <div className="flex items-center justify-center gap-3 py-2">
              {Array.from({ length: 4 }).map((_, idx) => {
                const hasValue = idx < pinInput.length;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      hasValue 
                        ? 'bg-blue-400 border-blue-400 scale-110 shadow-[0_0_8px_rgba(96,165,250,0.8)]' 
                        : 'border-zinc-700 bg-zinc-950/40'
                    }`}
                  />
                );
              })}
            </div>

            {passwordError && (
              <span className="text-[9px] text-red-400 font-bold bg-red-950/20 border border-red-900/30 px-3 py-1 rounded-lg">
                {passwordError}
              </span>
            )}

            {/* PIN Grid Visual Keyboard (Console Pad) */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[220px] mt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinKeyPress(num)}
                  className="w-14 h-12 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 active:scale-95 transition-all text-sm font-black text-zinc-200 cursor-pointer flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinBackspace}
                className="w-14 h-12 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 text-red-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Effacer"
              >
                <Delete size={14} />
              </button>
              <button
                type="button"
                onClick={() => handlePinKeyPress('0')}
                className="w-14 h-12 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 active:scale-95 transition-all text-sm font-black text-zinc-200 cursor-pointer flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinSubmit}
                className="w-14 h-12 rounded-xl bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/20 text-blue-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Valider"
              >
                <Check size={14} />
              </button>
            </div>

            {/* Back action */}
            <button
              onClick={() => setSelectedProfileForLogin(null)}
              className="mt-2 text-zinc-550 hover:text-white text-[9px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
            >
              Retour
            </button>

          </div>
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-6">
            
            <div className="flex flex-col gap-1.5 text-center">
              <h3 className="text-lg font-black tracking-wider text-zinc-100 uppercase flex items-center justify-center gap-2">
                <ShieldCheck size={20} className="text-blue-500" />
                <span>Nouveau Profil</span>
              </h3>
              <p className="text-[11px] text-zinc-400">Créez votre carte de profil et configurez vos paramètres de base</p>
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

              {/* PIN Code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Code PIN de protection à 4 chiffres (Obligatoire)</label>
                <input
                  type="text"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="ex: 1234"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-white text-xs focus:border-blue-500/50 focus:outline-none transition-colors font-mono tracking-widest"
                  required
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
                      className={`w-10 h-10 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
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
                  className="py-2.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-wider shadow-md cursor-pointer"
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
