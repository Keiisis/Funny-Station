'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CoverImage } from './CoverImage';
import { ProfileData, Game } from '@/types';
import { supabase } from '@/utils/supabase/client';
import { AudioEngine } from '@/drivers/AudioEngine';
import { Coins, ShoppingBag, Gamepad2, ArrowLeft, Check, AlertTriangle, PlayCircle, X, Star, Zap, Terminal, Search } from 'lucide-react';

interface StoreViewProps {
  profile: ProfileData;
  games: Game[];
  onClose: () => void;
  onBuyGame: (gameId: string, price: number) => void;
  onStartGame: (game: Game) => void;
  onRefreshProfile?: () => void;
}

export interface Cheat {
  id: string;
  gameId: string;
  gameSlug: string;
  name: string;
  description: string;
  price: number;
  code: string;
}

// Available Cheats for games in the catalog
const AVAILABLE_CHEATS: Cheat[] = [
  { id: 'c-neon-god', gameId: '', gameSlug: 'neon-runner', name: 'Invincibilité (God Mode)', description: 'Rend le vaisseau complètement insensible aux obstacles.', price: 150, code: 'god_mode' },
  { id: 'c-neon-score', gameId: '', gameSlug: 'neon-runner', name: 'Score Multiplier x10', description: 'Multiplie tous les points de score obtenus par 10.', price: 100, code: 'score_x10' },
  { id: 'c-jackie-lives', gameId: '', gameSlug: 'jackie-chan', name: 'Vies Infinies', description: 'Bloque le compteur de vies à 99.', price: 200, code: 'infinite_lives' },
  { id: 'c-jackie-inv', gameId: '', gameSlug: 'jackie-chan', name: 'Invincibilité Stunt', description: 'Jackie ne subit plus de dégâts des ennemis.', price: 250, code: 'god_mode' },
  { id: 'c-ray-speed', gameId: '', gameSlug: 'wasm-raytracer', name: 'Moteur Turbo', description: 'Accélère considérablement la vitesse de rendu.', price: 120, code: 'turbo_render' },
  { id: 'c-horror-ammo', gameId: '', gameSlug: 'top-down-horror', name: 'Munitions Infinies', description: 'Vos armes ne se vident jamais.', price: 180, code: 'infinite_ammo' }
];

export const StoreView: React.FC<StoreViewProps> = ({
  profile,
  games,
  onClose,
  onBuyGame,
  onStartGame,
  onRefreshProfile
}) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedCheat, setSelectedCheat] = useState<Cheat | null>(null);
  const [ownedCheats, setOwnedCheats] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 2D Navigation state
  // rowIndex: 0 = Hero Banner, 1 = Popular games shelf, 2 = New games shelf, 3 = Cheats shelf
  const [rowIndex, setRowIndex] = useState(0);
  const [colIndex, setColIndex] = useState(0);

  // Recherche + filtre par console (section "Tout le catalogue").
  const [search, setSearch] = useState('');
  const [consoleFilter, setConsoleFilter] = useState<string>('all');
  const CONSOLE_FILTERS: { key: string; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'gba', label: 'GBA' },
    { key: 'nes', label: 'NES' },
    { key: 'snes', label: 'SNES' },
    { key: 'js', label: 'Jeux' },
  ];
  const catalogueResults = games.filter((g) =>
    (consoleFilter === 'all' || g.runtime === consoleFilter) &&
    g.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  // Group games
  const popularGames = [...games].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 6);
  const newGames = [...games].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  
  // Hero game is the most popular game
  const heroGame = popularGames[0] || games[0];

  // Load owned cheats from profile-specific localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`funny_station_cheats_${profile.id}`);
      if (stored) {
        try {
          setOwnedCheats(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [profile.id]);

  const isGameOwned = (game: Game) => {
    if (!game.price || game.price === 0) return true;
    return profile.ownedGames.includes(game.id) || game.author_id === profile.id;
  };

  const isCheatOwned = (cheatId: string) => {
    return ownedCheats.includes(cheatId);
  };

  // 2D Navigation inputs listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If a modal or details view is open, pause the main 2D navigation
      if (selectedGame || selectedCheat || showConfirmModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          AudioEngine.getInstance().playSFX('select');
          setSelectedGame(null);
          setSelectedCheat(null);
          setShowConfirmModal(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        onClose();
        return;
      }

      // Max items in each row
      let maxCols = 1;
      if (rowIndex === 1) maxCols = popularGames.length;
      else if (rowIndex === 2) maxCols = newGames.length;
      else if (rowIndex === 3) maxCols = AVAILABLE_CHEATS.length;

      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', -0.05);
        nextRow = Math.max(0, rowIndex - 1);
        nextCol = 0; // Reset col index to 0 when changing rows
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', 0.05);
        nextRow = Math.min(3, rowIndex + 1);
        nextCol = 0;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', -0.15);
        nextCol = Math.max(0, colIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('navigate', 0.15);
        nextCol = Math.min(maxCols - 1, colIndex + 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        AudioEngine.getInstance().playSFX('select');
        triggerSelection();
      }

      setRowIndex(nextRow);
      setColIndex(nextCol);
    };

    const handleGamepadAction = (e: CustomEvent<{ direction: string; action?: string }>) => {
      if (e.detail.action === 'up') return;
      const dir = e.detail.direction;

      // If overlays are active
      if (selectedGame || selectedCheat || showConfirmModal) {
        if (dir === 'BACK') {
          AudioEngine.getInstance().playSFX('select');
          setSelectedGame(null);
          setSelectedCheat(null);
          setShowConfirmModal(false);
        }
        return;
      }

      if (dir === 'BACK') {
        AudioEngine.getInstance().playSFX('select');
        onClose();
        return;
      }

      let maxCols = 1;
      if (rowIndex === 1) maxCols = popularGames.length;
      else if (rowIndex === 2) maxCols = newGames.length;
      else if (rowIndex === 3) maxCols = AVAILABLE_CHEATS.length;

      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (dir === 'UP') {
        AudioEngine.getInstance().playSFX('navigate', -0.05);
        nextRow = Math.max(0, rowIndex - 1);
        nextCol = 0;
      } else if (dir === 'DOWN') {
        AudioEngine.getInstance().playSFX('navigate', 0.05);
        nextRow = Math.min(3, rowIndex + 1);
        nextCol = 0;
      } else if (dir === 'LEFT') {
        AudioEngine.getInstance().playSFX('navigate', -0.15);
        nextCol = Math.max(0, colIndex - 1);
      } else if (dir === 'RIGHT') {
        AudioEngine.getInstance().playSFX('navigate', 0.15);
        nextCol = Math.min(maxCols - 1, colIndex + 1);
      } else if (dir === 'CONFIRM') {
        AudioEngine.getInstance().playSFX('select');
        triggerSelection();
      }
      
      setRowIndex(nextRow);
      setColIndex(nextCol);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('funny_gamepad_action', handleGamepadAction as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('funny_gamepad_action', handleGamepadAction as EventListener);
    };
  }, [rowIndex, colIndex, selectedGame, selectedCheat, showConfirmModal]);

  const triggerSelection = () => {
    if (rowIndex === 0) {
      if (heroGame) handleSelectGame(heroGame);
    } else if (rowIndex === 1) {
      const g = popularGames[colIndex];
      if (g) handleSelectGame(g);
    } else if (rowIndex === 2) {
      const g = newGames[colIndex];
      if (g) handleSelectGame(g);
    } else if (rowIndex === 3) {
      const c = AVAILABLE_CHEATS[colIndex];
      if (c) handleSelectCheat(c);
    }
  };

  const handleSelectGame = (game: Game) => {
    AudioEngine.getInstance().playSFX('select');
    setSelectedGame(game);
    setSelectedCheat(null);
    setShowConfirmModal(false);
    setErrorMsg('');
  };

  const handleSelectCheat = (cheat: Cheat) => {
    AudioEngine.getInstance().playSFX('select');
    setSelectedCheat(cheat);
    setSelectedGame(null);
    setShowConfirmModal(false);
    setErrorMsg('');
  };

  const handleBuyClick = () => {
    if (selectedGame && selectedGame.price) {
      if (profile.funnyCoins < selectedGame.price) {
        setErrorMsg(`Coins insuffisants ! Requis: ${selectedGame.price} FC (Vous avez ${profile.funnyCoins} FC).`);
        return;
      }
      setShowConfirmModal(true);
    } else if (selectedCheat && selectedCheat.price) {
      if (profile.funnyCoins < selectedCheat.price) {
        setErrorMsg(`Coins insuffisants ! Requis: ${selectedCheat.price} FC (Vous avez ${profile.funnyCoins} FC).`);
        return;
      }
      setShowConfirmModal(true);
    }
  };

  const handleConfirmPurchase = () => {
    if (selectedGame && selectedGame.price) {
      onBuyGame(selectedGame.id, selectedGame.price);
      setShowConfirmModal(false);
      setErrorMsg('');
    } else if (selectedCheat && selectedCheat.price) {
      // Direct update of local storage and profile balance update via virtual buy
      const updatedBalance = profile.funnyCoins - selectedCheat.price;
      const updatedCheats = [...ownedCheats, selectedCheat.id];
      
      // Persist in localStorage
      localStorage.setItem(`funny_station_cheats_${profile.id}`, JSON.stringify(updatedCheats));
      setOwnedCheats(updatedCheats);

      // Perform a fake coins deduction by calling a virtual RPC or let the dashboard refresh.
      // Since we don't have a buyCheat RPC, we can inject coins update via supabase Profiles table.
      const deductCoins = async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ funny_coins: updatedBalance })
            .eq('id', profile.id);
          if (error) throw error;
          if (onRefreshProfile) onRefreshProfile();
        } catch (e) {
          console.error("Failed to deduct coins for cheat purchase:", e);
        }
      };
      
      deductCoins();
      setShowConfirmModal(false);
      setErrorMsg('');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md z-45 flex flex-col font-sans select-none animate-fade-in text-white overflow-hidden">
      
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-16 py-6 border-b border-zinc-800/40 bg-zinc-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-widest text-zinc-100 uppercase flex items-center gap-2">
              <ShoppingBag size={15} className="text-purple-400" />
              <span>FunnyStation Store</span>
            </h1>
            <span className="text-[8px] text-zinc-500 uppercase tracking-widest mt-0.5">Offres de jeux, contenus additionnels et codes de triche</span>
          </div>
        </div>

        {/* User Coins Balance */}
        <div className="flex items-center gap-2 bg-[#101930] border border-zinc-800/80 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <Coins size={13} className="text-amber-400" />
          <span className="text-xs font-black text-zinc-100 font-mono">{profile.funnyCoins} FC</span>
        </div>
      </div>

      {/* Main Store Scrollable Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-16">
        
        {/* HERO BANNER SECTION (Style PS5 À la une) */}
        {heroGame && (
          <div 
            onClick={() => handleSelectGame(heroGame)}
            className={`mx-16 mt-8 h-80 rounded-3xl overflow-hidden relative cursor-pointer border transition-all duration-500 group flex flex-col justify-end p-8 ${
              rowIndex === 0 
                ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)] scale-[1.01]' 
                : 'border-zinc-850 bg-zinc-950/20'
            }`}
          >
            {/* Background image & gradient overlay */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <CoverImage
                src={heroGame.background_url}
                alt={heroGame.title}
                priority
                sizes="100vw"
                className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            </div>

            {/* Hero content */}
            <div className="max-w-xl flex flex-col gap-3">
              <span className="text-[7px] uppercase font-black tracking-widest bg-purple-500 text-white px-2 py-0.5 rounded-full w-max">
                À La Une
              </span>
              <h2 className="text-4xl font-black tracking-wider uppercase leading-none drop-shadow-md text-zinc-100">
                {heroGame.title}
              </h2>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {heroGame.description}
              </p>
              
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                  <Coins size={10} />
                  {heroGame.price ? `${heroGame.price} FC` : 'Gratuit'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SHELVES / ROWS OF CONTENT */}
        <div className="flex flex-col gap-8 mt-10">
          
          {/* Row 1: Popular Games */}
          <div className="flex flex-col gap-3.5 px-16">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Jeux les plus joués</h3>
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2">
              {popularGames.map((game, idx) => {
                const isFocused = rowIndex === 1 && idx === colIndex;
                const owned = isGameOwned(game);

                return (
                  <div
                    key={game.id}
                    onClick={() => handleSelectGame(game)}
                    className={`relative flex-shrink-0 cursor-pointer rounded-2xl w-40 aspect-[9/14] overflow-hidden border transition-all duration-300 transform ${
                      isFocused
                        ? 'border-purple-500 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.35)] z-10'
                        : 'border-zinc-800/80 opacity-70 hover:opacity-100 hover:border-zinc-700'
                    }`}
                  >
                    <CoverImage src={game.background_url} alt={game.title} sizes="160px" priority={isFocused} fallbackClassName="absolute inset-0 bg-gradient-to-tr from-violet-950 via-fuchsia-950/50 to-zinc-950" />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                    
                    {/* Badge details */}
                    <div className="absolute inset-0 p-3.5 flex flex-col justify-between z-20">
                      <div className="flex justify-end items-start">
                        {owned ? (
                          <span className="text-[6.5px] uppercase font-black tracking-widest bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-400">
                            Possédé
                          </span>
                        ) : (
                          <span className="text-[6.5px] uppercase font-bold tracking-widest bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded text-amber-400">
                            {game.price} FC
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-[9px] font-black text-zinc-200 uppercase truncate">
                        {game.title}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 2: New Games */}
          <div className="flex flex-col gap-3.5 px-16">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dernières nouveautés</h3>
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2">
              {newGames.map((game, idx) => {
                const isFocused = rowIndex === 2 && idx === colIndex;
                const owned = isGameOwned(game);

                return (
                  <div
                    key={game.id}
                    onClick={() => handleSelectGame(game)}
                    className={`relative flex-shrink-0 cursor-pointer rounded-2xl w-40 aspect-[9/14] overflow-hidden border transition-all duration-300 transform ${
                      isFocused
                        ? 'border-purple-500 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.35)] z-10'
                        : 'border-zinc-800/80 opacity-70 hover:opacity-100 hover:border-zinc-700'
                    }`}
                  >
                    <CoverImage src={game.background_url} alt={game.title} sizes="160px" priority={isFocused} fallbackClassName="absolute inset-0 bg-gradient-to-tr from-violet-950 via-fuchsia-950/50 to-zinc-950" />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                    
                    {/* Badge details */}
                    <div className="absolute inset-0 p-3.5 flex flex-col justify-between z-20">
                      <div className="flex justify-end items-start">
                        {owned ? (
                          <span className="text-[6.5px] uppercase font-black tracking-widest bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-400">
                            Possédé
                          </span>
                        ) : (
                          <span className="text-[6.5px] uppercase font-bold tracking-widest bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded text-amber-400">
                            {game.price} FC
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-[9px] font-black text-zinc-200 uppercase truncate">
                        {game.title}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 2.5: TOUT LE CATALOGUE (recherche + filtre par console) */}
          <div className="flex flex-col gap-3.5 px-16">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tout le catalogue</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800 rounded-full px-3 py-1.5">
                  <Search size={12} className="text-zinc-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un jeu..."
                    className="bg-transparent outline-none text-[11px] text-zinc-200 placeholder-zinc-600 w-40"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {CONSOLE_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setConsoleFilter(f.key)}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                        consoleFilter === f.key
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 py-1">
              {catalogueResults.length === 0 ? (
                <span className="text-[11px] text-zinc-600 py-6">Aucun jeu ne correspond à ta recherche.</span>
              ) : (
                catalogueResults.map((game) => {
                  const owned = isGameOwned(game);
                  return (
                    <div
                      key={game.id}
                      onClick={() => handleSelectGame(game)}
                      className="relative flex-shrink-0 cursor-pointer rounded-2xl w-32 aspect-[9/14] overflow-hidden border border-zinc-800/80 opacity-85 hover:opacity-100 hover:border-zinc-600 transition-all"
                    >
                      <CoverImage src={game.background_url} alt={game.title} sizes="128px" fallbackClassName="absolute inset-0 bg-gradient-to-tr from-violet-950 via-fuchsia-950/50 to-zinc-950" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                      <div className="absolute inset-0 p-2.5 flex flex-col justify-between z-20">
                        <span
                          className={`self-end text-[6.5px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded border ${
                            owned
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {owned ? 'Possédé' : `${game.price} FC`}
                        </span>
                        <h4 className="text-[9px] font-black text-zinc-200 uppercase truncate">{game.title}</h4>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Row 3: Cheats & Add-ons Shop */}
          <div className="flex flex-col gap-3.5 px-16">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-yellow-500 animate-pulse" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Extensions & Codes de triche (FunnyCheats)</h3>
            </div>
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2">
              {AVAILABLE_CHEATS.map((cheat, idx) => {
                const isFocused = rowIndex === 3 && idx === colIndex;
                const owned = isCheatOwned(cheat.id);
                const matchingGame = games.find(g => g.slug === cheat.gameSlug);
                
                return (
                  <div
                    key={cheat.id}
                    onClick={() => handleSelectCheat(cheat)}
                    className={`relative flex-shrink-0 cursor-pointer rounded-2xl w-48 h-32 p-4 border transition-all duration-300 transform flex flex-col justify-between ${
                      isFocused
                        ? 'border-yellow-500 bg-yellow-500/5 scale-105 shadow-[0_0_20px_rgba(234,179,8,0.25)] z-10'
                        : 'border-zinc-800/80 bg-zinc-950/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[6.5px] uppercase tracking-wider font-extrabold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                          Cheat Pack
                        </span>
                        {owned ? (
                          <span className="text-[6px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Possédé</span>
                        ) : (
                          <span className="text-[7.5px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">{cheat.price} FC</span>
                        )}
                      </div>
                      <h4 className="text-[10px] font-bold text-zinc-150 uppercase truncate">{cheat.name}</h4>
                      <p className="text-[8px] text-zinc-400 line-clamp-2 leading-relaxed">{cheat.description}</p>
                    </div>

                    {matchingGame && (
                      <span className="text-[6.5px] text-zinc-500 uppercase tracking-widest font-black truncate border-t border-zinc-850/50 pt-2">
                        Pour: {matchingGame.title}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* FULLSCREEN PRODUCT SHEET OVERLAY (Style PS5 Immersif) */}
      {(selectedGame || selectedCheat) && (
        <div className="fixed inset-0 w-screen h-screen z-50 bg-[#020512]/95 flex flex-col animate-fade-in">
          
          {/* Blurred Background Art */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <img 
              src={selectedGame ? selectedGame.background_url : games.find(g => g.slug === selectedCheat?.gameSlug)?.background_url} 
              className="w-full h-full object-cover filter blur-[40px] opacity-25 scale-105"
              alt="Blurred Back"
            />
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#020512]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020512] via-[#020512]/60 to-transparent" />
          </div>

          {/* Close Header */}
          <div className="flex items-center justify-between px-16 py-6 border-b border-zinc-900/30">
            <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500">
              Détails du Produit
            </span>
            <button
              onClick={() => {
                AudioEngine.getInstance().playSFX('select');
                setSelectedGame(null);
                setSelectedCheat(null);
              }}
              className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer hover:rotate-90"
            >
              <X size={18} />
            </button>
          </div>

          {/* Details Body */}
          <div className="flex-1 flex px-16 py-10 items-stretch gap-12 overflow-y-auto no-scrollbar">
            
            {/* LEFT COLUMN: Large cover & Action buttons */}
            <div className="w-80 flex flex-col gap-6 flex-shrink-0">
              <div className="w-full aspect-[9/13] rounded-3xl border border-zinc-800 shadow-[0_15px_40px_rgba(0,0,0,0.6)] overflow-hidden">
                <img 
                  src={selectedGame ? selectedGame.background_url : games.find(g => g.slug === selectedCheat?.gameSlug)?.background_url} 
                  className="w-full h-full object-cover" 
                  alt="Product Cover"
                />
              </div>

              {/* Status / Purchase Area */}
              <div className="glass-panel p-5 rounded-2xl border border-zinc-850 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] uppercase tracking-widest font-black text-zinc-500">Statut</span>
                  {selectedGame ? (
                    isGameOwned(selectedGame) ? (
                      <span className="text-[7.5px] uppercase font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-400">Débloqué</span>
                    ) : (
                      <span className="text-[7.5px] uppercase font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-400 flex items-center gap-0.5">
                        <Coins size={10} /> {selectedGame.price} FC
                      </span>
                    )
                  ) : selectedCheat ? (
                    isCheatOwned(selectedCheat.id) ? (
                      <span className="text-[7.5px] uppercase font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-400">Actif</span>
                    ) : (
                      <span className="text-[7.5px] uppercase font-bold bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full text-yellow-400 flex items-center gap-0.5">
                        <Coins size={10} /> {selectedCheat.price} FC
                      </span>
                    )
                  ) : null}
                </div>

                {/* Confirm purchase or launch button */}
                {selectedGame ? (
                  isGameOwned(selectedGame) ? (
                    <button
                      onClick={() => {
                        AudioEngine.getInstance().playSFX('select');
                        setSelectedGame(null);
                        onClose();
                        onStartGame(selectedGame);
                      }}
                      className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-550 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <PlayCircle size={14} />
                      <span>Lancer le jeu</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleBuyClick}
                      className="w-full py-3 rounded-full bg-purple-600 hover:bg-purple-550 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <ShoppingBag size={14} />
                      <span>Acheter maintenant</span>
                    </button>
                  )
                ) : selectedCheat ? (
                  isCheatOwned(selectedCheat.id) ? (
                    <div className="text-center py-2.5 bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <Check size={12} />
                      <span>Déjà possédé</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleBuyClick}
                      className="w-full py-3 rounded-full bg-yellow-500 hover:bg-yellow-450 text-zinc-950 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Zap size={14} />
                      <span>Acheter le Cheat Code</span>
                    </button>
                  )
                ) : null}
              </div>
            </div>

            {/* RIGHT COLUMN: Metadata & Trophy achievements */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                {selectedGame ? (
                  <>
                    <h3 className="text-3xl font-black uppercase tracking-wider text-zinc-100">{selectedGame.title}</h3>
                    <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold">
                      <span className="flex items-center gap-0.5"><Star size={10} className="text-yellow-500" /> {selectedGame.rating || '5.0'}</span>
                    </div>
                  </>
                ) : selectedCheat ? (
                  <>
                    <h3 className="text-3xl font-black uppercase tracking-wider text-yellow-500 flex items-center gap-1.5">
                      <Terminal size={22} />
                      {selectedCheat.name}
                    </h3>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Code de triche / Add-on</span>
                  </>
                ) : null}
              </div>

              <div className="border-t border-zinc-900 py-4">
                <h4 className="text-[9px] uppercase tracking-widest font-black text-zinc-500 mb-2">Description</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  {selectedGame ? selectedGame.description : selectedCheat?.description}
                </p>
              </div>

              {/* Game Cheat Codes or details */}
              {selectedGame && (
                <div className="border-t border-zinc-900 py-4 flex flex-col gap-4">
                  <h4 className="text-[9px] uppercase tracking-widest font-black text-zinc-500">Extensions disponibles (FunnyCheats)</h4>
                  {AVAILABLE_CHEATS.filter(c => c.gameSlug === selectedGame.slug).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {AVAILABLE_CHEATS.filter(c => c.gameSlug === selectedGame.slug).map(c => {
                        const cheatOwned = isCheatOwned(c.id);
                        return (
                          <div 
                            key={c.id} 
                            onClick={() => handleSelectCheat(c)}
                            className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all duration-300"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-zinc-200 truncate max-w-[140px]">{c.name}</span>
                              <span className="text-[7.5px] text-zinc-500 truncate max-w-[140px]">{c.description}</span>
                            </div>
                            {cheatOwned ? (
                              <span className="text-[7px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-black">Possédé</span>
                            ) : (
                              <span className="text-[7px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded font-mono font-bold">+{c.price} FC</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-zinc-500 text-[10px] font-medium italic">Aucune triche disponible pour ce jeu.</div>
                  )}
                </div>
              )}

              {/* Warnings / System notices */}
              {errorMsg && (
                <div className="p-4 rounded-2xl border border-red-900/30 bg-red-950/20 text-[9px] text-red-400 font-bold flex items-start gap-2 leading-normal">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* CONFIRMATION PURCHASE DIALOG BOX (Style PS5) */}
      {showConfirmModal && (selectedGame || selectedCheat) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="glass-panel max-w-xs w-full p-6 rounded-3xl border border-zinc-800 text-center shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
              <ShoppingBag size={18} />
            </div>
            
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black tracking-wider text-zinc-100 uppercase">Confirmer la transaction</h3>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Voulez-vous dépenser <strong className="text-amber-400">{selectedGame ? selectedGame.price : selectedCheat?.price} FC</strong> pour débloquer <strong>{selectedGame ? selectedGame.title : selectedCheat?.name}</strong> ?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => {
                  AudioEngine.getInstance().playSFX('select');
                  setShowConfirmModal(false);
                }}
                className="py-2.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="py-2.5 rounded-full bg-purple-600 hover:bg-purple-550 text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Acheter
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
