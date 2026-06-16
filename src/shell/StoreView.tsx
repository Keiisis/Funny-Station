'use client';

import React, { useState } from 'react';
import { ProfileData, Game } from '@/types';
import { AudioEngine } from '@/drivers/AudioEngine';
import { Coins, ShoppingBag, Gamepad2, ArrowLeft, Check, AlertTriangle, PlayCircle } from 'lucide-react';

interface StoreViewProps {
  profile: ProfileData;
  games: Game[];
  onClose: () => void;
  onBuyGame: (gameId: string, price: number) => void;
  onStartGame: (game: Game) => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  profile,
  games,
  onClose,
  onBuyGame,
  onStartGame
}) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectGame = (game: Game) => {
    AudioEngine.getInstance().playSFX('select');
    setSelectedGame(game);
    setShowConfirmModal(false);
    setErrorMsg('');
  };

  const isGameOwned = (game: Game) => {
    // If game has no price or price is 0, it's free / owned by default
    if (!game.price || game.price === 0) return true;
    return profile.ownedGames.includes(game.id) || game.author_id === profile.id;
  };

  const handleBuyClick = () => {
    if (!selectedGame || !selectedGame.price) return;
    AudioEngine.getInstance().playSFX('select');

    if (profile.funnyCoins < selectedGame.price) {
      setErrorMsg(`Solde insuffisant ! Il vous manque ${selectedGame.price - profile.funnyCoins} FunnyCoins. Débloquez des trophées pour en gagner !`);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = () => {
    if (!selectedGame || !selectedGame.price) return;

    AudioEngine.getInstance().playSFX('select');
    onBuyGame(selectedGame.id, selectedGame.price);
    setShowConfirmModal(false);
    setErrorMsg('');
  };

  return (
    <div className="w-screen h-screen bg-[#070b13] text-white flex flex-col font-sans select-none relative z-30 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-12 py-6 border-b border-zinc-800/80 bg-[#0d1527] z-40">
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
            <h1 className="text-xl font-black tracking-widest text-zinc-100 uppercase flex items-center gap-2">
              <ShoppingBag size={20} className="text-purple-400" />
              <span>FunnyStation Store</span>
            </h1>
            <span className="text-[10px] text-zinc-400">Achetez des jeux exclusifs créés par la communauté avec vos FunnyCoins</span>
          </div>
        </div>

        {/* User Balance */}
        <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-850 px-4 py-2 rounded-full">
          <Coins size={14} className="text-amber-400" />
          <span className="text-xs font-bold text-zinc-100">{profile.funnyCoins} FC</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Games grid */}
        <div className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-80px)]">
          <h2 className="text-sm font-bold tracking-widest text-zinc-400 uppercase mb-6">Tous les jeux disponibles</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {games.map(game => {
              const owned = isGameOwned(game);
              const isSelected = selectedGame?.id === game.id;
              
              return (
                <div
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className={`glass-panel rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 hover:scale-[1.03] flex flex-col justify-between h-56 relative group ${
                    isSelected 
                      ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                      : 'border-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  {/* Game cover background */}
                  <div className="absolute inset-0 -z-10 overflow-hidden">
                    <img 
                      src={game.background_url} 
                      alt={game.title} 
                      className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#070b13]/40 to-transparent" />
                  </div>

                  {/* Header badge */}
                  <div className="p-4 flex justify-between items-start">
                    <span className="text-[7px] uppercase font-bold tracking-widest bg-zinc-900/80 border border-zinc-850 px-2 py-0.5 rounded-full">
                      {game.runtime === 'js' ? 'HTML5' : game.runtime.toUpperCase()}
                    </span>
                    {owned ? (
                      <span className="text-[7px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Possédé
                      </span>
                    ) : (
                      <span className="text-[7px] uppercase font-bold tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Coins size={8} /> {game.price} FC
                      </span>
                    )}
                  </div>

                  {/* Footer details */}
                  <div className="p-4 flex flex-col gap-1">
                    <h3 className="text-xs font-bold text-zinc-100 leading-snug group-hover:text-purple-400 transition-colors truncate">
                      {game.title}
                    </h3>
                    <p className="text-[9px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {game.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Game description & Buy actions */}
        <div className="w-80 border-l border-zinc-850 bg-[#0a0f1c]/80 backdrop-blur-md p-8 flex flex-col justify-between overflow-y-auto">
          {selectedGame ? (
            <div className="flex flex-col gap-6 h-full justify-between">
              <div className="flex flex-col gap-4">
                {/* Visual preview card */}
                <div className="w-full h-36 rounded-2xl overflow-hidden border border-zinc-800 shadow-md relative">
                  <img src={selectedGame.background_url} alt={selectedGame.title} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 bg-zinc-950/80 border border-zinc-850 text-[8px] uppercase font-bold px-2 py-0.5 rounded-full">
                    {selectedGame.runtime}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-black tracking-wide text-zinc-100">{selectedGame.title}</h3>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Par FunnyStation Community</span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  {selectedGame.description}
                </p>

                {errorMsg && (
                  <div className="p-3.5 rounded-xl border border-red-900/30 bg-red-950/20 text-[10px] leading-relaxed text-red-400 font-bold flex items-start gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-zinc-850">
                {isGameOwned(selectedGame) ? (
                  <button
                    onClick={() => {
                      AudioEngine.getInstance().playSFX('select');
                      onStartGame(selectedGame);
                    }}
                    className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlayCircle size={14} />
                    <span>Lancer le jeu</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBuyClick}
                    className="w-full py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBag size={14} />
                    <span>Acheter pour {selectedGame.price} FC</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
              <ShoppingBag size={32} className="text-zinc-700 animate-pulse" />
              <p className="text-[10px] uppercase tracking-widest font-bold">Sélectionnez un jeu pour l'inspecter et l'acheter</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-8 rounded-3xl border border-zinc-800 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-5">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
              <ShoppingBag size={24} />
            </div>
            
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-black tracking-wider text-zinc-100 uppercase">Confirmer l'achat</h3>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Voulez-vous dépenser <strong className="text-amber-400">{selectedGame.price} FunnyCoins</strong> pour débloquer définitivement <strong>{selectedGame.title}</strong> ?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => {
                  AudioEngine.getInstance().playSFX('select');
                  setShowConfirmModal(false);
                }}
                className="py-2.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
