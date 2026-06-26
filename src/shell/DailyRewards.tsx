'use client';

import React, { useState, useEffect } from 'react';
import { Gift, Flame, Coins, X, Sparkles, Star } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';
import { claimDailyReward, fetchDailyStatus, getWeeklyRewards, calculateReward } from '@/lib/progression';

interface DailyRewardsProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onCoinUpdate?: (newCoins: number) => void;
}

export const DailyRewards: React.FC<DailyRewardsProps> = ({ userId, isOpen, onClose, onCoinUpdate }) => {
  const [streak, setStreak] = useState(0);
  const [canClaim, setCanClaim] = useState(true);
  const [justClaimed, setJustClaimed] = useState(false);
  const [reward, setReward] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCoins, setShowCoins] = useState(false);

  const weeklyRewards = getWeeklyRewards();

  useEffect(() => {
    if (!isOpen) return;
    loadStatus();
  }, [isOpen, userId]);

  const loadStatus = async () => {
    try {
      const status = await fetchDailyStatus(userId);
      setStreak(status.streak);
      setCanClaim(status.can_claim);
    } catch (e) {
      console.error('[DailyRewards] Load error:', e);
    }
  };

  const handleClaim = async () => {
    if (!canClaim || loading) return;
    setLoading(true);
    try {
      const result = await claimDailyReward();
      setStreak(result.streak);
      setReward(result.reward);
      setCanClaim(false);
      setJustClaimed(true);
      setShowCoins(true);
      AudioEngine.getInstance().playSFX('select');
      setTimeout(() => setShowCoins(false), 3000);
    } catch (e) {
      console.error('[DailyRewards] Claim error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentDay = (streak % 7) || 7;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-zinc-900/95 border border-zinc-700/50 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with flame streak */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-amber-500/10 to-transparent">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-zinc-800 rounded-lg cursor-pointer">
            <X size={16} className="text-zinc-400" />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center">
              <Gift size={28} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-black text-white">Récompense quotidienne</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Flame size={16} className="text-orange-400" />
              <span className="text-sm font-black text-orange-400">{streak} jours de suite !</span>
            </div>
          </div>
        </div>

        {/* Weekly calendar */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-7 gap-1.5">
            {weeklyRewards.map(({ day, coins, bonus }) => {
              const isToday = day === currentDay && canClaim;
              const isPast = day < currentDay || (day === currentDay && !canClaim);
              const isFuture = day > currentDay;

              return (
                <div
                  key={day}
                  className={`relative flex flex-col items-center py-2.5 rounded-xl border transition-all ${
                    isToday
                      ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 border-amber-500/40 ring-1 ring-amber-400/30'
                      : isPast
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-zinc-800/40 border-zinc-700/20'
                  }`}
                >
                  <span className={`text-[8px] uppercase font-black tracking-wide ${
                    isPast ? 'text-emerald-500' : isToday ? 'text-amber-400' : 'text-zinc-600'
                  }`}>
                    J{day}
                  </span>
                  <span className={`text-[10px] font-black mt-0.5 ${
                    isPast ? 'text-emerald-400' : isToday ? 'text-amber-300' : 'text-zinc-500'
                  }`}>
                    {coins}
                  </span>
                  {isPast && <span className="text-[8px] text-emerald-400">✓</span>}
                  {bonus && (
                    <span className="absolute -top-1 -right-1 text-[8px]">{bonus}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim button */}
        <div className="px-5 pb-6">
          {canClaim ? (
            <button
              onClick={handleClaim}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-2xl text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={16} />
              {loading ? 'Chargement...' : `Réclamer ${calculateReward(streak + 1)} coins`}
            </button>
          ) : (
            <div className="text-center py-3 bg-zinc-800/40 rounded-2xl border border-zinc-700/20">
              <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                <Star size={14} /> Déjà réclamé aujourd'hui !
              </p>
              {justClaimed && reward > 0 && (
                <p className="text-[10px] text-amber-400 mt-1 font-bold">+{reward} FunnyCoins ajoutés</p>
              )}
              <p className="text-[10px] text-zinc-500 mt-1">Reviens demain pour continuer ton streak !</p>
            </div>
          )}
        </div>

        {/* Floating coins animation */}
        {showCoins && (
          <div className="fixed inset-0 pointer-events-none z-[80]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-amber-400 font-black text-lg animate-bounce"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${30 + Math.random() * 30}%`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: `${800 + Math.random() * 600}ms`,
                }}
              >
                <Coins size={20} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
