'use client';

import React, { useState } from 'react';
import { ProfileData, Game } from '@/types';
import { AudioEngine } from '@/drivers/AudioEngine';
import { User, Lock, Camera, Coins, Trophy, Gamepad2, ArrowLeft, PlusCircle, Trash, CheckCircle2 } from 'lucide-react';

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
  const [username, setUsername] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [password, setPassword] = useState(profile.password || '');
  const [accountType, setAccountType] = useState<'gamer' | 'creator'>(profile.accountType || 'gamer');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Store creator publish game form
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
      password: password.trim() || undefined,
      accountType
    });

    setSuccessMsg('Profil mis à jour avec succès !');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handlePresetSelect = (url: string) => {
    AudioEngine.getInstance().playSFX('select');
    setAvatar(url);
    setShowCustomAvatarInput(false);
  };

  const handleCustomAvatarSubmit = () => {
    if (customAvatarUrl.trim()) {
      AudioEngine.getInstance().playSFX('select');
      setAvatar(customAvatarUrl.trim());
      setCustomAvatarUrl('');
      setShowCustomAvatarInput(false);
    }
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

    setSuccessMsg('Jeu publié dans le FunnyStation Store !');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Filter games created by this user
  const myCreatedGames = games.filter(g => g.author_id === profile.id);

  return (
    <div className="w-screen h-screen bg-[#070b13] text-white flex flex-col font-sans select-none relative z-30 overflow-y-auto pb-12">
      {/* Header bar */}
      <div className="flex items-center justify-between px-12 py-6 border-b border-zinc-800/80 bg-[#0d1527] sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              AudioEngine.getInstance().playSFX('select');
              onClose();
            }}
            className="p-2 rounded-full hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-widest text-zinc-100 uppercase">Espace Profil & Créateur</h1>
            <span className="text-[10px] text-zinc-400">Gérez vos informations, votre sécurité et vos jeux créés</span>
          </div>
        </div>

        <button
          onClick={() => {
            AudioEngine.getInstance().playSFX('select');
            onClose();
          }}
          className="glass-panel px-5 py-2 rounded-full border border-zinc-800 text-[10px] tracking-wider uppercase text-zinc-400 hover:text-white transition-all hover:scale-105"
        >
          Retour à la Console
        </button>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-6xl w-full mx-auto px-12 mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Summary stats */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
            {/* Background Blur design element */}
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-blue-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl" />

            {/* Avatar container */}
            <div className="relative group mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-zinc-700/80 shadow-[0_0_20px_rgba(0,0,0,0.6)]">
                <img src={avatar} alt={username} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera size={20} className="text-white" />
              </div>
            </div>

            <h2 className="text-xl font-bold tracking-wide text-zinc-100">{username}</h2>
            <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border mt-2 ${
              accountType === 'creator'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {accountType === 'creator' ? 'Créateur de Jeux' : 'Gamer'}
            </span>

            {/* Stats block */}
            <div className="grid grid-cols-3 gap-3 w-full mt-6 pt-6 border-t border-zinc-800/60 text-zinc-300">
              <div className="flex flex-col items-center">
                <Coins size={16} className="text-amber-400 mb-1" />
                <span className="text-xs font-bold">{profile.funnyCoins}</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest">Coins</span>
              </div>
              <div className="flex flex-col items-center">
                <Trophy size={16} className="text-yellow-400 mb-1" />
                <span className="text-xs font-bold">{profile.ownedGames.length}</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest">Jeux</span>
              </div>
              <div className="flex flex-col items-center">
                <Gamepad2 size={16} className="text-cyan-400 mb-1" />
                <span className="text-xs font-bold">{myCreatedGames.length}</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest">Créés</span>
              </div>
            </div>
          </div>

          {/* Quick instructions / Info panel */}
          <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 text-zinc-400 text-[11px] leading-relaxed shadow-lg">
            <h3 className="text-zinc-200 font-bold uppercase tracking-wider mb-2 text-xs">Sécurité du Compte</h3>
            <p className="mb-3">
              Le mot de passe protège votre profil à l'écran d'accueil. Si défini, aucun autre joueur sur cette machine ne pourra entrer dans votre compte sans saisir votre code.
            </p>
            <p>
              En mode <strong>Créateur de Jeux</strong>, vous pouvez fixer des prix de vente pour vos créations et collecter des FunnyCoins de la part des acheteurs sur la plateforme.
            </p>
          </div>
        </div>

        {/* Center/Right Columns: Settings Form or Creator Studio */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Profile Edit Info Form */}
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800/80 shadow-lg">
            <h3 className="text-base font-black tracking-wider text-zinc-100 uppercase mb-6 flex items-center gap-2">
              <User size={18} className="text-blue-400" /> Profil & Paramètres
            </h3>

            {successMsg && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/40 border border-emerald-800/40 px-4 py-3 rounded-xl mb-6">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveInfo} className="flex flex-col gap-5">
              {/* Pseudo input */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-medium focus:border-blue-500/50 focus:outline-none transition-colors"
                  placeholder="Nom de joueur"
                  required
                />
              </div>

              {/* Password input */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold flex items-center gap-1">
                  <Lock size={12} /> Mot de passe de protection (Optionnel)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-medium focus:border-blue-500/50 focus:outline-none transition-colors"
                  placeholder="Entrez un code PIN ou mot de passe"
                />
              </div>

              {/* Account Type Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Type de Compte</label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      AudioEngine.getInstance().playSFX('select');
                      setAccountType('gamer');
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer flex flex-col items-center gap-1.5 transition-all text-center ${
                      accountType === 'gamer'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                    }`}
                  >
                    <Gamepad2 size={24} className={accountType === 'gamer' ? 'text-blue-400' : 'text-zinc-500'} />
                    <span className="text-xs font-bold text-zinc-100">Gamer</span>
                    <span className="text-[8px] text-zinc-500 leading-snug">Jouez aux jeux et débloquez des trophées</span>
                  </div>

                  <div
                    onClick={() => {
                      AudioEngine.getInstance().playSFX('select');
                      setAccountType('creator');
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer flex flex-col items-center gap-1.5 transition-all text-center ${
                      accountType === 'creator'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                    }`}
                  >
                    <PlusCircle size={24} className={accountType === 'creator' ? 'text-purple-400' : 'text-zinc-500'} />
                    <span className="text-xs font-bold text-zinc-100">Game Creator</span>
                    <span className="text-[8px] text-zinc-500 leading-snug">Codez, publiez et vendez vos jeux</span>
                  </div>
                </div>
              </div>

              {/* Avatar Selector Grid */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Sélectionner un Avatar</label>
                <div className="flex flex-wrap items-center gap-3">
                  {PRESET_AVATARS.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => handlePresetSelect(url)}
                      className={`w-14 h-14 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                        avatar === url
                          ? 'border-blue-500 scale-105 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                          : 'border-transparent hover:border-zinc-700'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      AudioEngine.getInstance().playSFX('select');
                      setShowCustomAvatarInput(!showCustomAvatarInput);
                    }}
                    className="w-14 h-14 rounded-full border-2 border-dashed border-zinc-700 hover:border-zinc-400 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all"
                  >
                    <Camera size={18} />
                  </button>
                </div>

                {showCustomAvatarInput && (
                  <div className="flex gap-2 mt-2 animate-fade-in">
                    <input
                      type="text"
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      placeholder="URL d'une image d'avatar"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-blue-500/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCustomAvatarSubmit}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase transition-colors"
                    >
                      Valider
                    </button>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="mt-4 w-full py-3 rounded-full bg-white text-zinc-950 font-bold uppercase tracking-wider text-xs shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                Enregistrer les modifications
              </button>
            </form>
          </div>

          {/* Game Creator Studio Panel (Show if accountType is creator) */}
          {accountType === 'creator' && onPublishGame && (
            <div className="glass-panel p-8 rounded-3xl border border-zinc-800/80 shadow-lg">
              <h3 className="text-base font-black tracking-wider text-zinc-100 uppercase mb-6 flex items-center gap-2">
                <PlusCircle size={18} className="text-purple-400" /> Studio de Publication
              </h3>

              <form onSubmit={handlePublishGameSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Titre du Jeu</label>
                    <input
                      type="text"
                      value={newGameTitle}
                      onChange={(e) => setNewGameTitle(e.target.value)}
                      placeholder="ex: Hyper Void"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-purple-500/50 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Technologie / Langage</label>
                    <select
                      value={newGameRuntime}
                      onChange={(e) => setNewGameRuntime(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-purple-500/50 focus:outline-none"
                    >
                      <option value="js">Javascript (HTML5 Canvas)</option>
                      <option value="python">Python (Pyodide)</option>
                      <option value="wasm">WebAssembly (C++)</option>
                      <option value="lua">Lua (Fengari)</option>
                      <option value="java">Java (CheerpJ)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Description</label>
                  <textarea
                    value={newGameDescription}
                    onChange={(e) => setNewGameDescription(e.target.value)}
                    placeholder="Entrez une courte description accrocheuse pour le Store..."
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-purple-500/50 focus:outline-none min-h-[80px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Prix en FunnyCoins (FC)</label>
                    <input
                      type="number"
                      value={newGamePrice}
                      onChange={(e) => setNewGamePrice(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0 (Gratuit)"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Image de couverture (Background URL)</label>
                    <input
                      type="text"
                      value={newGameBgUrl}
                      onChange={(e) => setNewGameBgUrl(e.target.value)}
                      placeholder="ex: https://images.unsplash.com/..."
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold">Vidéo Cinématique (URL MP4)</label>
                  <input
                    type="text"
                    value={newGameVideoUrl}
                    onChange={(e) => setNewGameVideoUrl(e.target.value)}
                    placeholder="URL d'un fichier .mp4 en boucle (Optionnel)"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-purple-500/50 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full py-3 rounded-full bg-purple-600 text-white font-bold uppercase tracking-wider text-xs shadow-md hover:bg-purple-500 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <PlusCircle size={16} />
                  <span>Publier dans le FunnyStation Store</span>
                </button>
              </form>

              {/* List of Creator's games */}
              <div className="mt-8 border-t border-zinc-850 pt-6">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-4">Mes jeux créés ({myCreatedGames.length})</h4>
                {myCreatedGames.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {myCreatedGames.map(game => (
                      <div key={game.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                            <img src={game.background_url} alt={game.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-200">{game.title}</span>
                            <span className="text-[9px] text-zinc-500 uppercase font-mono mt-0.5">{game.runtime} • {game.price ? `${game.price} FC` : 'Gratuit'}</span>
                          </div>
                        </div>

                        {onDeleteGame && (
                          <button
                            onClick={() => {
                              AudioEngine.getInstance().playSFX('select');
                              if (confirm('Voulez-vous supprimer ce jeu ?')) {
                                onDeleteGame(game.id);
                              }
                            }}
                            className="p-2 rounded-lg border border-red-950/40 text-red-500 hover:bg-red-950/30 hover:border-red-500/30 transition-colors"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-600 text-center py-4">Vous n'avez pas encore publié de jeu. Utilisez le formulaire ci-dessus pour lancer votre premier titre !</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
