'use client';

import React, { useState } from 'react';
import { ProfileData, Game } from '@/types';
import { AudioEngine } from '@/drivers/AudioEngine';
import { User, Lock, Camera, Coins, Trophy, Gamepad2, ArrowLeft, PlusCircle, Trash, CheckCircle2, X } from 'lucide-react';

interface ProfileSpaceProps {
  profile: ProfileData;
  games: Game[];
  onClose: () => void;
  onUpdateProfile: (updated: ProfileData) => void;
  onPublishGame?: (gameData: Omit<Game, 'id' | 'play_count' | 'rating' | 'created_at'>) => void;
  onDeleteGame?: (gameId: string) => void;
}

export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80', // Nathan Drake style
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', // Aloy style
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', // Gamer P3
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', // Gamer P4
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80', // Abstract Anime
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80'  // Controller Art
];

export const ProfileSpace: React.FC<ProfileSpaceProps> = ({
  profile,
  games,
  onClose,
  onUpdateProfile,
  onPublishGame,
  onDeleteGame
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'create'>('info');
  
  const [username, setUsername] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [pin, setPin] = useState(profile.password || '');
  const [accountType, setAccountType] = useState<'gamer' | 'creator'>(profile.accountType || 'gamer');
  const [showAvatarPresets, setShowAvatarPresets] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Publish Form State
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameDescription, setNewGameDescription] = useState('');
  const [newGamePrice, setNewGamePrice] = useState(0);
  const [newGameRuntime, setNewGameRuntime] = useState<'js' | 'python' | 'wasm' | 'lua' | 'java'>('js');
  const [newGameVideoUrl, setNewGameVideoUrl] = useState('');
  const [newGameBgUrl, setNewGameBgUrl] = useState('');

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    AudioEngine.getInstance().playSFX('select');
    onUpdateProfile({
      ...profile,
      username: username.trim(),
      avatar,
      password: pin.trim() || undefined,
      accountType
    });

    setSuccessMsg('Profil enregistré !');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handlePublishGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameTitle.trim() || !onPublishGame) return;

    AudioEngine.getInstance().playSFX('select');
    onPublishGame({
      title: newGameTitle.trim(),
      slug: newGameTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: newGameDescription.trim(),
      runtime: newGameRuntime,
      entry_point: newGameRuntime === 'js' ? 'index.js' : newGameRuntime === 'python' ? 'main.py' : newGameRuntime === 'wasm' ? 'game.wasm' : newGameRuntime === 'lua' ? 'game.lua' : 'game.jar',
      assets_bucket_path: `/games/${newGameTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      background_url: newGameBgUrl.trim() || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop',
      video_url: newGameVideoUrl.trim() || undefined,
      price: newGamePrice > 0 ? newGamePrice : undefined,
      manifest: {},
      author_id: profile.id
    });

    // Reset Form
    setNewGameTitle('');
    setNewGameDescription('');
    setNewGamePrice(0);
    setNewGameRuntime('js');
    setNewGameVideoUrl('');
    setNewGameBgUrl('');

    setSuccessMsg('Jeu publié dans le Store !');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const myCreatedGames = games.filter(g => g.author_id === profile.id);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in p-4 select-none">
      {/* Gamer Card Dialog Wrapper */}
      <div 
        className="glass-panel max-w-4xl w-full rounded-3xl border border-zinc-800/80 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden max-h-[90vh] relative"
        style={{
          background: 'linear-gradient(145deg, rgba(16,24,48,0.92) 0%, rgba(6,10,24,0.96) 100%)'
        }}
      >
        {/* Glow accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />

        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-850/60 bg-[#0d162a]/60">
          <div className="flex items-center gap-3">
            <User size={18} className="text-blue-400" />
            <h2 className="text-sm font-black tracking-widest text-zinc-100 uppercase">Carte de Profil Gamer Card</h2>
          </div>

          <button
            onClick={() => {
              AudioEngine.getInstance().playSFX('select');
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Body Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left panel: Avatar & Account stats */}
          <div className="w-full md:w-72 border-r border-zinc-850/60 p-6 flex flex-col items-center justify-between bg-zinc-950/20">
            <div className="flex flex-col items-center w-full">
              {/* Profile Image with Camera hover */}
              <div 
                onClick={() => {
                  AudioEngine.getInstance().playSFX('select');
                  setShowAvatarPresets(!showAvatarPresets);
                }}
                className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-zinc-700/60 shadow-lg mb-4 cursor-pointer"
              >
                <img src={avatar} alt={username} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={18} className="text-white" />
                </div>
              </div>

              <h3 className="text-sm font-black tracking-wider text-zinc-100 uppercase truncate max-w-full">{username}</h3>
              <span className={`text-[8px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full border mt-2 ${
                accountType === 'creator'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {accountType === 'creator' ? 'Créateur' : 'Gamer'}
              </span>

              {/* Coins, Games & Created summary */}
              <div className="grid grid-cols-3 gap-2 w-full mt-6 pt-5 border-t border-zinc-850/60 text-center text-zinc-300">
                <div className="flex flex-col items-center">
                  <Coins size={12} className="text-amber-400 mb-0.5" />
                  <span className="text-[10px] font-bold">{profile.funnyCoins}</span>
                  <span className="text-[7px] text-zinc-500 uppercase font-black mt-0.5">Coins</span>
                </div>
                <div className="flex flex-col items-center">
                  <Trophy size={12} className="text-yellow-400 mb-0.5" />
                  <span className="text-[10px] font-bold">{profile.ownedGames.length}</span>
                  <span className="text-[7px] text-zinc-500 uppercase font-black mt-0.5">Jeux</span>
                </div>
                <div className="flex flex-col items-center">
                  <Gamepad2 size={12} className="text-cyan-400 mb-0.5" />
                  <span className="text-[10px] font-bold">{myCreatedGames.length}</span>
                  <span className="text-[7px] text-zinc-500 uppercase font-black mt-0.5">Créés</span>
                </div>
              </div>
            </div>

            {/* Inner profile tabs */}
            <div className="flex flex-col gap-2 w-full mt-6">
              <button
                onClick={() => { AudioEngine.getInstance().playSFX('select'); setActiveSubTab('info'); }}
                className={`w-full py-2 rounded-xl text-left px-4 text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                  activeSubTab === 'info'
                    ? 'bg-blue-500/10 border-blue-500/35 text-blue-400'
                    : 'bg-zinc-950/30 border-transparent hover:border-zinc-800 text-zinc-400'
                }`}
              >
                Paramètres & PIN
              </button>
              
              {accountType === 'creator' && (
                <button
                  onClick={() => { AudioEngine.getInstance().playSFX('select'); setActiveSubTab('create'); }}
                  className={`w-full py-2 rounded-xl text-left px-4 text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    activeSubTab === 'create'
                      ? 'bg-purple-500/10 border-purple-500/35 text-purple-400'
                      : 'bg-zinc-950/30 border-transparent hover:border-zinc-800 text-zinc-400'
                  }`}
                >
                  Studio Créateur
                </button>
              )}
            </div>
          </div>

          {/* Right panel: Content Area */}
          <div className="flex-1 p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
            
            {successMsg && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/40 border border-emerald-800/40 px-4 py-3 rounded-xl mb-6">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Sub-tab 1: Profile Settings Info */}
            {activeSubTab === 'info' && (
              <form onSubmit={handleSaveInfo} className="flex flex-col gap-5 max-w-lg">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Nom d'utilisateur</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-white text-xs font-bold focus:border-blue-500/50 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
                    <Lock size={11} /> Code PIN de protection à 4 chiffres (Obligatoire)
                  </label>
                  <input
                    type="text"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-white text-xs font-bold focus:border-blue-500/50 focus:outline-none font-mono tracking-widest"
                    placeholder="Code PIN à 4 chiffres"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Type de Compte</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => {
                        AudioEngine.getInstance().playSFX('select');
                        setAccountType('gamer');
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer flex flex-col items-center gap-1 transition-all ${
                        accountType === 'gamer'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-800'
                      }`}
                    >
                      <Gamepad2 size={18} className={accountType === 'gamer' ? 'text-blue-400' : 'text-zinc-550'} />
                      <span className="text-[10px] font-black text-zinc-100">Gamer</span>
                    </div>

                    <div
                      onClick={() => {
                        AudioEngine.getInstance().playSFX('select');
                        setAccountType('creator');
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer flex flex-col items-center gap-1 transition-all ${
                        accountType === 'creator'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-800'
                      }`}
                    >
                      <PlusCircle size={18} className={accountType === 'creator' ? 'text-purple-400' : 'text-zinc-550'} />
                      <span className="text-[10px] font-black text-zinc-100">Creator</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-white text-zinc-950 font-black uppercase tracking-widest text-[10px] shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer mt-4"
                >
                  Enregistrer
                </button>
              </form>
            )}

            {/* Sub-tab 2: Studio Creator Panel */}
            {activeSubTab === 'create' && accountType === 'creator' && onPublishGame && (
              <div className="flex flex-col gap-6">
                
                {/* Publish Game Form */}
                <form onSubmit={handlePublishGameSubmit} className="flex flex-col gap-4">
                  <h4 className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Mettre en vente un jeu</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Titre du jeu</label>
                      <input
                        type="text"
                        value={newGameTitle}
                        onChange={(e) => setNewGameTitle(e.target.value)}
                        placeholder="ex: Hyper Void"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-855 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/40"
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Technologie</label>
                      <select
                        value={newGameRuntime}
                        onChange={(e) => setNewGameRuntime(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-855 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/40"
                      >
                        <option value="js">JS (HTML5 Canvas)</option>
                        <option value="python">Python (Pyodide)</option>
                        <option value="wasm">WebAssembly (C++)</option>
                        <option value="lua">Lua (Fengari)</option>
                        <option value="java">Java (CheerpJ)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Description</label>
                    <textarea
                      value={newGameDescription}
                      onChange={(e) => setNewGameDescription(e.target.value)}
                      placeholder="Petite description pour attirer les acheteurs..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-855 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/40 min-h-[50px]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Prix (FC)</label>
                      <input
                        type="number"
                        value={newGamePrice}
                        onChange={(e) => setNewGamePrice(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-855 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/40"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Couverture (Image URL)</label>
                      <input
                        type="text"
                        value={newGameBgUrl}
                        onChange={(e) => setNewGameBgUrl(e.target.value)}
                        placeholder="ex: https://images.unsplash.com/..."
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-855 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/40"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Cinématique Vidéo (Direct MP4 URL)</label>
                    <input
                      type="text"
                      value={newGameVideoUrl}
                      onChange={(e) => setNewGameVideoUrl(e.target.value)}
                      placeholder="ex: https://player.vimeo.com/...mp4"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-855 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/40"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-550 text-white font-bold uppercase tracking-widest text-[9px] shadow-md transition-all active:scale-95 cursor-pointer mt-2"
                  >
                    Publier dans la Boutique Store
                  </button>
                </form>

                {/* List published games */}
                <div className="border-t border-zinc-850/60 pt-4 mt-2">
                  <h4 className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-3">Mes jeux publiés ({myCreatedGames.length})</h4>
                  {myCreatedGames.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {myCreatedGames.map(game => (
                        <div key={game.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-[64px] rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                              <img src={game.background_url} alt={game.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-200">{game.title}</span>
                              <span className="text-[8px] text-zinc-500 uppercase font-mono mt-0.5">
                                {game.runtime} • {game.price ? `${game.price} FC` : 'Gratuit'}
                              </span>
                            </div>
                          </div>

                          {onDeleteGame && (
                            <button
                              onClick={() => {
                                AudioEngine.getInstance().playSFX('select');
                                if (confirm(`Supprimer ${game.title} ?`)) {
                                  onDeleteGame(game.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-red-950/40 text-red-500 hover:bg-red-950/30 hover:border-red-500/30 transition-colors cursor-pointer"
                            >
                              <Trash size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-zinc-650 text-center py-2">Aucun jeu publié.</p>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preset Avatars Floating Selector Overlay */}
      {showAvatarPresets && (
        <div className="fixed inset-0 z-65 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-zinc-800 max-w-sm w-full text-center flex flex-col gap-4">
            <h4 className="text-xs font-black tracking-widest text-zinc-100 uppercase">Choisir une Photo</h4>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_AVATARS.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setAvatar(url);
                    setShowAvatarPresets(false);
                    AudioEngine.getInstance().playSFX('select');
                  }}
                  className={`w-16 h-16 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                    avatar === url ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt={`Preset Avatar ${idx}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAvatarPresets(false)}
              className="mt-2 text-zinc-500 hover:text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
