'use client';

import React, { useState } from 'react';
import { ProfileData, Game } from '@/types';
import { AudioEngine } from '@/drivers/AudioEngine';
import { Coins, ShoppingBag, Gamepad2, ArrowLeft, Check, AlertTriangle, PlayCircle, X } from 'lucide-react';

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
    if (!game.price || game.price === 0) return true;
    return profile.ownedGames.includes(game.id) || game.author_id === profile.id;
  };

  const handleBuyClick = () => {
    if (!selectedGame || !selectedGame.price) return;
    AudioEngine.getInstance().playSFX('select');

    if (profile.funnyCoins < selectedGame.price) {
      setErrorMsg(`Coins insuffisants ! Requis: ${selectedGame.price} FC (Vous avez ${profile.funnyCoins} FC).`);
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
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[3px] z-40 flex flex-col font-sans select-none animate-fade-in">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-12 py-6 border-b border-zinc-850/60 bg-[#0d162a]/60">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              AudioEngine.getInstance().playSFX('select');
              onClose();
            }}
            className="p-2 rounded-full hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-black tracking-widest text-zinc-100 uppercase flex items-center gap-2">
              <ShoppingBag size={16} className="text-purple-400" />
              <span>FunnyStation Store</span>
            </h1>
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider mt-0.5">Achetez des exclusivités créées par les joueurs</span>
          </div>
        </div>

        {/* User Balance */}
        <div className="flex items-center gap-2 bg-[#101930] border border-zinc-800 px-4 py-2 rounded-full shadow-md">
          <Coins size={14} className="text-amber-400" />
          <span className="text-xs font-black text-zinc-100">{profile.funnyCoins} FC</span>
        </div>
      </div>

      {/* Embedded Store Body */}
      <div className="flex-1 overflow-y-auto p-12">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black tracking-widest text-zinc-400 uppercase">Jeux Disponibles</h2>
          </div>

          {/* Premium Store Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {games.map(game => {
              const owned = isGameOwned(game);
              
              return (
                <div
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className="glass-panel rounded-2xl overflow-hidden cursor-pointer border border-zinc-800/80 transition-all duration-300 hover:scale-[1.04] hover:border-purple-500/50 hover:shadow-[0_8px_25px_rgba(168,85,247,0.25)] flex flex-col aspect-[9/16] w-full relative group"
                >
                  {/* Game cover background image */}
                  <div className="absolute inset-0 -z-10 overflow-hidden">
                    <img 
                      src={game.background_url} 
                      alt={game.title} 
                      className="w-full h-full object-cover opacity-35 group-hover:opacity-50 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
                  </div>

                  {/* Header badges */}
                  <div className="p-3 flex justify-between items-start">
                    <span className="text-[7px] uppercase font-bold tracking-widest bg-zinc-950/80 border border-zinc-850 px-2 py-0.5 rounded-full text-zinc-350">
                      {game.runtime === 'js' ? 'HTML5' : game.runtime.toUpperCase()}
                    </span>
                    {owned ? (
                      <span className="text-[7px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Possédé
                      </span>
                    ) : (
                      <span className="text-[7px] uppercase font-bold tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-mono">
                        {game.price} FC
                      </span>
                    )}
                  </div>

                  {/* Details bottom */}
                  <div className="bg-zinc-950/70 backdrop-blur-xs border-t border-zinc-900/35 p-3 mt-auto flex flex-col gap-0.5">
                    <h3 className="text-[10px] font-bold text-zinc-100 group-hover:text-purple-400 transition-colors truncate">
                      {game.title}
                    </h3>
                    <span className="text-[7px] text-zinc-550 uppercase tracking-widest font-semibold">
                      {game.runtime} runtime
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fiche Produit (Product Details Modal) */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="glass-panel max-w-lg w-full rounded-3xl border border-zinc-800 text-left shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden relative"
            style={{
              background: 'linear-gradient(145deg, rgba(16,24,48,0.95) 0%, rgba(6,10,24,0.98) 100%)'
            }}
          >
            {/* Header image preview */}
            <div className="w-full h-44 relative overflow-hidden border-b border-zinc-850">
              <img src={selectedGame.background_url} alt={selectedGame.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              
              {/* Close product details */}
              <button
                onClick={() => {
                  AudioEngine.getInstance().playSFX('select');
                  setSelectedGame(null);
                }}
                className="absolute top-4 right-4 p-1 rounded-full bg-black/60 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-zinc-100 uppercase tracking-wide">{selectedGame.title}</h3>
                  <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">Technologie : {selectedGame.runtime}</span>
                </div>

                {!isGameOwned(selectedGame) ? (
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1">
                    <Coins size={12} /> {selectedGame.price} FC
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    Débloqué
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                {selectedGame.description}
              </p>

              {errorMsg && (
                <div className="p-3 rounded-xl border border-red-900/30 bg-red-950/20 text-[9px] text-red-400 font-bold flex items-start gap-1.5 leading-normal">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => {
                    AudioEngine.getInstance().playSFX('select');
                    setSelectedGame(null);
                  }}
                  className="py-2.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
                >
                  Fermer
                </button>
                {isGameOwned(selectedGame) ? (
                  <button
                    onClick={() => {
                      AudioEngine.getInstance().playSFX('select');
                      setSelectedGame(null);
                      onClose(); // Close store
                      onStartGame(selectedGame); // Launch game
                    }}
                    className="py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-550 text-white text-[10px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <PlayCircle size={12} />
                    <span>Lancer</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBuyClick}
                    className="py-2.5 rounded-full bg-purple-600 hover:bg-purple-550 text-white text-[10px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <ShoppingBag size={12} />
                    <span>Acheter</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="glass-panel max-w-xs w-full p-6 rounded-3xl border border-zinc-800 text-center shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
              <ShoppingBag size={18} />
            </div>
            
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black tracking-wider text-zinc-100 uppercase">Confirmer l'achat</h3>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Voulez-vous dépenser <strong className="text-amber-400">{selectedGame.price} FC</strong> pour débloquer <strong>{selectedGame.title}</strong> ?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => {
                  AudioEngine.getInstance().playSFX('select');
                  setShowConfirmModal(false);
                }}
                className="py-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase tracking-wider bg-zinc-950/40 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="py-2 rounded-full bg-purple-600 hover:bg-purple-550 text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer"
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
